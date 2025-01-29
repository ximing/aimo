import { FastifyReply, FastifyRequest } from "fastify";
import { Octokit } from "@octokit/rest";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import { db } from "@/lib/db.js";
import { users } from "@/config/schema.js";
import { eq } from "drizzle-orm";
import {
  LoginInput,
  RegisterInput,
  AuthResponse,
  zodSchemas,
} from "./schema.js";
import {
  oauthConfig,
  getEnabledProviders,
  validateOAuthConfig,
} from "@/config/oauth.js";

interface AuthUser {
  id: number;
  email: string;
  role: string;
}
interface RequestWithUser<T = unknown> extends FastifyRequest {
  user: {
    id: number;
    email: string;
    role: string;
    name?: string;
  };
  body: T;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  verified_email: boolean;
}

export async function register(
  request: RequestWithUser<RegisterInput>,
  reply: FastifyReply,
): Promise<AuthResponse> {
  const result = zodSchemas.register.safeParse(request.body);
  if (!result.success) {
    throw reply.status(400).send({
      message: "Validation error",
      errors: result.error.errors,
    });
  }

  const { email, password, name } = result.data;

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw reply.status(400).send({
      message: "Email already registered",
      code: "EMAIL_EXISTS",
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email,
      hashedPassword,
      name,
      role: "user",
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });

  // Generate token
  const token = await reply.jwtSign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    {
      expiresIn: "7d", // Token expires in 7 days
    },
  );

  return { user, token };
}

export async function login(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
): Promise<AuthResponse> {
  const { email, password } = request.body;

  // 添加日志以便调试
  console.log('Login attempt:', { email });

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // 添加日志以便调试
  console.log('User found:', { found: !!user });

  if (!user || !user.hashedPassword) {
    throw reply.status(401).send({
      message: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.hashedPassword);

  // 添加日志以便调试
  console.log('Password valid:', validPassword);

  if (!validPassword) {
    throw reply.status(401).send({
      message: "Invalid credentials",
      code: "INVALID_CREDENTIALS",
    });
  }

  // Generate token
  const token = await reply.jwtSign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    {
      expiresIn: "7d", // Token expires in 7 days
    },
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  };
}

export async function githubAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    validateOAuthConfig("github");
  } catch (error) {
    return reply.status(400).send({
      message: "GitHub OAuth is not configured",
      code: "OAUTH_NOT_CONFIGURED",
    });
  }

  const code = request.query.code as string;

  if (!code) {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${oauthConfig.github.clientId}`;
    return reply.redirect(authUrl);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: oauthConfig.github.clientId,
          client_secret: oauthConfig.github.clientSecret,
          code,
        }),
      },
    );

    const { access_token } = await tokenResponse.json();

    // Get user info from GitHub
    const octokit = new Octokit({ auth: access_token });
    const { data: githubUser } = await octokit.users.getAuthenticated();

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.githubId, githubUser.id.toString()),
    });

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: githubUser.email || `${githubUser.id}@github.user`,
          name: githubUser.name || githubUser.login,
          githubId: githubUser.id.toString(),
          role: "user",
          hashedPassword: null,
        })
        .returning();
    }

    // Generate token
    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Redirect to frontend with token
    return reply.redirect(`/auth/callback?token=${token}`);
  } catch (error) {
    console.error("GitHub auth error:", error);
    return reply.redirect("/auth/error");
  }
}

export async function googleAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    validateOAuthConfig("google");
  } catch (error) {
    return reply.status(400).send({
      message: "Google OAuth is not configured",
      code: "OAUTH_NOT_CONFIGURED",
    });
  }

  const code = request.query.code as string;

  if (!code) {
    const oauth2Client = new OAuth2Client(
      oauthConfig.google.clientId,
      oauthConfig.google.clientSecret,
      oauthConfig.google.callbackUrl,
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
    });

    return reply.redirect(authUrl);
  }

  try {
    const oauth2Client = new OAuth2Client(
      oauthConfig.google.clientId,
      oauthConfig.google.clientSecret,
      oauthConfig.google.callbackUrl,
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { data: googleUser } = await oauth2Client.request<GoogleUserInfo>({
      url: "https://www.googleapis.com/oauth2/v2/userinfo",
    });

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.googleId, googleUser.id),
    });

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.id,
          role: "user",
          hashedPassword: null,
        })
        .returning();
    }

    // Generate token
    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Redirect to frontend with token
    return reply.redirect(`/auth/callback?token=${token}`);
  } catch (error) {
    console.error("Google auth error:", error);
    return reply.redirect("/auth/error");
  }
}

export async function refreshToken(
  request: RequestWithUser,
  reply: FastifyReply,
) {
  try {
    const user = request.user;

    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      {
        expiresIn: "7d",
      },
    );

    return { token };
  } catch (error) {
    throw reply.status(401).send({
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
}

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, request.user.id),
    columns: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      hashedPassword: false,
    },
  });

  if (!user) {
    throw reply.status(404).send({
      message: "User not found",
      code: "USER_NOT_FOUND",
    });
  }

  return user;
}

export async function getAuthProviders(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  return getEnabledProviders();
}
