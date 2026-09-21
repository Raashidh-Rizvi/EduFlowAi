# EduFlow AI — React Frontend

The React/Vite application provides Admin, Instructor and Student web experiences. Existing code uses hooks/context and browser storage; dependency declarations do not establish working React Router or Zustand architecture. API fallback and approval/publication gaps remain PARTIAL.

## Local commands

Run from the frontend directory. Configure the backend connection using the [whole-system run guide](../docs/project/18_RUN_AND_SETUP.md).

~~~powershell
npm ci
npm run dev
npm run build
npm run test:e2e
~~~

The development configuration uses port 2174. E2E tests require the relevant application/services and test data; no passing result is asserted here.

## Key entry points

- [Application shell](src/App.jsx) and [bootstrap](src/main.jsx)
- [Pages](src/pages/)
- [Shared API client](src/services/api.js) and [services](src/services/)
- [Package scripts](package.json)

Use server outcomes for authoritative academic/reward state. Shared shell/session/navigation/API infrastructure belongs to the integration effort; owned behavior is defined in the matrix.

## Canonical documentation

[Start here](../docs/README.md) · [Responsibility matrix](../docs/responsibilities/RESPONSIBILITY_MATRIX.md) · [Workflows](../docs/project/02_SYSTEM_WORKFLOWS.md) · [Permissions](../docs/project/04_ROLES_AND_PERMISSIONS.md) · [Quiz pipeline](../docs/project/11_QUIZ_PIPELINE.md) · [Status](../docs/project/17_IMPLEMENTATION_STATUS.md)
