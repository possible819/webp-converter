# WebP Converter

이미지를 WebP로 변환하는 웹 앱입니다. 브라우저에서 드래그 앤 드롭으로 여러 파일을 올리면 변환되고, 변환 목록과 히스토리에서 다운로드할 수 있습니다.

## 기능

- **복수 파일 변환**: 여러 이미지를 한 번에 업로드 (최대 20개, 파일당 10MB)
- **히스토리**: 변환된 파일은 서버 재시작 후에도 유지되며, 목록에서 다시 다운로드 가능
- **다운로드**: UUID 기준 다운로드, 저장 시 원본 파일명으로 저장

## 기술 스택

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express
- **이미지 변환**: [Sharp](https://sharp.pixelplumbing.com/)
- **업로드**: Multer (메모리 스토리지)

## API

| Method | Endpoint | 설명 |
|--------|----------|------|
| `GET` | `/` | 웹 UI (동적 HTML) |
| `GET` | `/app.js` | 클라이언트 스크립트 |
| `POST` | `/convert` | 이미지 업로드 후 WebP 변환 (multipart, 필드 `file`, 복수 가능) |
| `GET` | `/download/:id` | 변환 파일 다운로드 (UUID, 원본 파일명으로 저장) |
| `GET` | `/api/history` | 변환 히스토리 목록 JSON |

### POST /convert

- **요청**: `multipart/form-data`, 필드명 `file`, 여러 파일 시 동일 필드로 반복
- **응답**: `{ "files": [ { "id": "uuid", "originalName": "이름.webp" }, ... ] }`

### GET /api/history

- **응답**: `[ { "id": "uuid", "originalName": "이름.webp", "createdAt": "ISO8601" }, ... ]`

## 데이터 저장

- **변환 파일**: `data/output/<uuid>.webp`
- **메타데이터**: `data/history.json` (id → originalName, createdAt)
- **경로 변경**: 환경 변수 `DATA_DIR` (기본값 `data`)
- `data/` 디렉터리는 `.gitignore`에 포함되어 커밋되지 않습니다.

## 사전 요구 사항

- Node.js 18+
- Yarn 1.x

## 설치 및 실행

```bash
yarn install
yarn build
yarn start
```

- **기본 포트**: 8080 (환경 변수 `PORT`로 변경 가능)
- **개발**: `yarn serve:dev` — nodemon + ts-node, 포트 8080
- **PM2**: `yarn pm2:start` — `ecosystem.config.cjs` 기준 (포트 10001)

## 스크립트

| 스크립트 | 설명 |
|----------|------|
| `yarn start` | 빌드된 앱 실행 |
| `yarn build` | TypeScript 컴파일 |
| `yarn serve:dev` | 개발 서버 (핫 리로드) |
| `yarn pm2:start` / `pm2:stop` / `pm2:restart` / `pm2:logs` / `pm2:status` | PM2 관리 |
| `yarn lint` | ESLint |
| `yarn format` | Prettier |

## 프로젝트 구조

```
├── src/
│   └── app.ts       # 서버 진입점, 라우트, 동적 HTML
├── public/
│   └── app.js       # 웹 UI 클라이언트 스크립트
├── data/             # 런타임 생성 (output, history.json)
├── dist/             # 빌드 결과
├── package.json
├── tsconfig.json
└── ecosystem.config.cjs
```

## 라이선스

MIT
