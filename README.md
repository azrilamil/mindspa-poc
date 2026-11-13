# MindSpa POC

A public portfolio proof of concept for a mindfulness and wellbeing research app. Built from scratch as a clean demonstration of the engineering (React, TypeScript, Vite, an installable web app, tests, and Docker). It is **not** a copy of any private clinical research system.

**Live demo:** [https://mindspa-poc.azril.io](https://mindspa-poc.azril.io)

> **Demo with synthetic data, not a medical tool.** This app uses fake local data only. It is not a medical device, it does not give health advice, and it is not part of a clinical study. It is not affiliated with any clinic, university, or other institution.

## What it shows

- A persistent demo banner so visitors never mistake this for a real medical product
- English-only interface
- A short wellbeing check-in with original, generic prompts (written fresh for this demo)
- A guided breathing session with a timer
- Progress history stored only in the browser (`localStorage`), seeded with synthetic sample entries
- No accounts, no real authentication, no backend, and no real user records
- Automated tests, lint, a production Docker image, and GitHub Actions CI

## Run locally

```bash
npm ci
npm test
npm run lint
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Docker

```bash
docker build -t mindspa-poc .
docker run --rm -p 8080:80 mindspa-poc
```

Then open [http://localhost:8080](http://localhost:8080).

## Stack

- React 19 and TypeScript
- Vite
- Vitest and Testing Library
- Nginx Alpine in a multi-stage Dockerfile

## What this is not

This repository is a portfolio demonstration. It does not contain clinical questionnaires, study access codes, partner or institution names, real user records, or deployment secrets.

Built by [Mohd Azril Amil](https://github.com/azrilamil).
