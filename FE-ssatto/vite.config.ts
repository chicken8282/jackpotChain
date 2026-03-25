import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

/**
 * [챗봇] GMS API 프록시 미들웨어 플러그인
 *
 * /gms-proxy/* 요청을 https://gms.ssafy.io/gmsapi/* 로 프록시합니다.
 *
 * 핵심: configureServer 훅에서 함수를 "return"하면 vite 내부 미들웨어
 *       이후가 아니라 **이전**에 등록됩니다. 이렇게 해야 SPA fallback보다
 *       먼저 /gms-proxy 요청을 가로챌 수 있습니다.
 *
 * 프로덕션 배포 시 Nginx에서 동일한 프록시 룰을 설정해야 합니다.
 */
function gmsProxyPlugin(): Plugin {
  return {
    name: "gms-proxy",
    configureServer(server) {
      // ★ 함수를 return하면 vite 내부 미들웨어보다 "뒤"에 등록됨
      //    → SPA fallback이 먼저 가로챔 (이전 버그 원인)
      //
      // ★ 직접 use()를 호출하면 vite 내부 미들웨어보다 "앞"에 등록됨
      //    → /gms-proxy 요청을 확실히 가로챌 수 있음
      server.middlewares.use(async (req, res, next) => {
        // /gms-proxy로 시작하는 요청만 처리
        if (!req.url?.startsWith("/gms-proxy")) {
          return next();
        }

        // /gms-proxy 접두사를 제거하고 /gmsapi로 변환
        const stripped = req.url.replace(/^\/gms-proxy/, "");
        const gmsHost = process.env.VITE_GMS_HOST ?? "https://gms.ssafy.io/gmsapi";
        const targetUrl = `${gmsHost}${stripped}`;
        console.log(`[GMS Proxy] ${req.method} ${req.url} → ${targetUrl}`);

        try {
          // 요청 본문 읽기
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk));
          }
          const body = Buffer.concat(chunks);

          // 원본 요청의 헤더를 복사 (host, connection 제외)
          const headers: Record<string, string> = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (key === "host" || key === "connection" || !value) continue;
            headers[key] = Array.isArray(value) ? value.join(", ") : value;
          }

          // GMS 서버로 요청 전달
          const upstream = await fetch(targetUrl, {
            method: req.method ?? "POST",
            headers,
            body: body.length > 0 ? body : undefined,
          });

          console.log(`[GMS Proxy] ← ${upstream.status}`);

          // 응답 헤더 복사
          res.statusCode = upstream.status;
          upstream.headers.forEach((value, key) => {
            if (key === "transfer-encoding") return;
            res.setHeader(key, value);
          });

          // SSE 스트리밍: 청크 단위로 파이프
          if (upstream.body) {
            const reader = upstream.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err) {
          console.error("[GMS Proxy] ERROR:", err);
          res.statusCode = 502;
          res.end("GMS Proxy Error");
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), gmsProxyPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["motion"],
          crypto: ["@noble/curves", "@noble/hashes", "@scure/base"],
        },
      },
    },
  },
});
