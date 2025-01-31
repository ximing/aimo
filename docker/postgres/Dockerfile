ARG PG_VERSION=17
FROM pgvector/pgvector:pg${PG_VERSION}

ARG USE_CHINA_MIRROR=0
RUN if [ x"${USE_CHINA_MIRROR}" = x1 ]; then \
      for f in /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources; do \
        if [ -f "${f}" ]; then \
          sed -i 's/deb.debian.org/mirror.sjtu.edu.cn/;s/security.debian.org/mirror.sjtu.edu.cn/' "${f}"; \
        fi \
      done \
    && sed -i 's@apt.postgresql.org/pub@mirrors.cloud.tencent.com/postgresql@' /etc/apt/sources.list.d/pgdg.list; \
    fi

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
      apt-transport-https \
      bzip2 \
      ca-certificates \
      curl \
      gcc \
      libc6-dev \
      make \
  && PG_VERSION=$(pg_config --version | awk '{print $2}' | cut -d. -f1) \
  && apt-get install -y \
      postgresql-server-dev-${PG_VERSION} \
  && curl -sSkLf "http://www.xunsearch.com/scws/down/scws-1.2.3.tar.bz2" | tar xjf - \
  &&  if [ x"${USE_CHINA_MIRROR}" = x1 ]; then \
        ZHPARSER_URL="https://mirror.ghproxy.com/${ZHPARSER_URL}"; \
      fi \
  && curl -sSkLf "${ZHPARSER_URL}" | tar xzf - \
  && cd scws-1.2.3 \
  && ./configure \
  && make -j$(nproc) install V=0 \
  && cd /zhparser-master \
  && make -j$(nproc) install \
  && apt-get purge -y gcc \
        make \
        libc6-dev \
        curl \
        bzip2 \
        apt-transport-https \
        ca-certificates \
        libpq-dev="${LIBPQ5_VER}" \
        "postgresql-server-dev-${PG_MAJOR}=${PG_VERSION}" \
  && apt-get autoremove --purge -y \
  && apt-get clean \
  && rm -rf /zhparser-master \
    /scws-1.2.3 \
    /etc/apt/sources.list.d/fury.list \
    /var/lib/apt/lists/*

# pg_trgm is recommend but not required.
RUN echo "CREATE EXTENSION IF NOT EXISTS pg_trgm;\n\
CREATE EXTENSION IF NOT EXISTS zhparser;\n\
DO\n\
\$\$BEGIN\n\
    CREATE TEXT SEARCH CONFIGURATION chinese_zh (PARSER = zhparser);\n\
    ALTER TEXT SEARCH CONFIGURATION chinese_zh ADD MAPPING FOR n,v,a,i,e,l,t WITH simple;\n\
EXCEPTION\n\
   WHEN unique_violation THEN\n\
      NULL;  -- ignore error\n\
END;\$\$;\n\
" > /docker-entrypoint-initdb.d/init-zhparser.sql