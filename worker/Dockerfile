FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      libreoffice-writer \
      libreoffice-calc \
      libreoffice-impress \
      qpdf \
      ghostscript \
      fonts-dejavu-core \
      fonts-noto-core \
      tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY cli.mjs validation.mjs pdfProtection.mjs ./

RUN useradd -u 10001 -m worker \
    && mkdir -p /work/input /work/output \
    && chown -R worker:worker /work /app

USER worker

ENV HOME=/tmp
ENV XDG_CONFIG_HOME=/tmp/.config
ENV SAL_USE_VCLPLUGIN=svp

ENTRYPOINT ["/usr/bin/tini", "--", "node", "/app/cli.mjs"]
CMD ["health"]
