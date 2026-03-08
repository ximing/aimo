import request from '../utils/request';

export interface UserFeatureConfigDto {
  userModelId: string | null;
}

/**
 * Get tag model configuration
 */
export async function getTagModelConfig(): Promise<UserFeatureConfigDto> {
  const response = await request.get<UserFeatureConfigDto>('/api/v1/user-feature-configs/tag-model');
  return response.data;
}

/**
 * Update tag model configuration
 */
export async function updateTagModelConfig(
  userModelId: string | null
): Promise<UserFeatureConfigDto> {
  const response = await request.put<UserFeatureConfigDto>('/api/v1/user-feature-configs/tag-model', {
    userModelId,
  });
  return response.data;
}
