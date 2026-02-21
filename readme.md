# Transcendence

This project has been created as part of the 42 curriculum by
tmilin.

## Description

_The “Description” section should also contain a clear name for the project and its
key features._

_TODO_

## Instruction

_The “Instructions” section should mention all the needed prerequisites (software,
tools, versions, configuration like .env setup, etc.), and step-by-step
instructions to run the project._

### Before anything

- Tested with Docker 29.0.0 or Podman 5.7.1 (with the `DOCKER` variable set to
`podman` in `Makefile`)
- `cp .env.example .env` and edit `.env` as necessary
- The server will listen on port `8000`

### Release

- `make build` to build the container images
- `make up` to deploy the application
- `make down` to remove the containers

### Development

- `make dev` to start the development server
- `make dev-down` to remove the development containers
- `make check` to run CI checks before pushing
- `make format` to format the code

### Tools

- `make reset` to delete the volumes
- `make seed` to seed the database with random data, __will delete existing
data__
- In development, the database can be inspected at [local.drizzle.studio](https://local.drizzle.studio)

## Resources

_TODO_

## Team Information

### //

_TODO: role_
_TODO: brief description of their responsibilities_

### //

__Technical Lead__
_TODO: brief description of their responsibilities_

### //

_TODO: role_
_TODO: brief description of their responsibilities_

### //

_TODO: role_
_TODO: brief description of their responsibilities_

## Project Management

_TODO_

## Technical Stack

<!-- - Docker / Podman (containerization)
- Caddy (reverse proxy)
- Postgres (database)
- Garage (object storage)
- Bun (web application server)
- SvelteKit (full-stack framework)
- TailwindCSS (CSS framework)
- Drizzle (ORM) -->

## Database Schema

Import `drawdb.json` into this web application to view the schema : [https://www.drawdb.app/editor](https://www.drawdb.app/editor)

## Features List

_TODO_

## Modules

- [ ] _Major_ Use a framework for both the frontend and backend
- [ ] _Major_ Implement real-time features using WebSockets or similar technology
- [ ] _Major_ Allow users to interact with other users
  - [ ] A basic chat system (send/receive messages between users)
  - [ ] A profile system (view user information)
  - [ ] A friends system (add/remove friends, see friends list)
- [ ] _Major_ A public API to interact with the database with a secured API key,
rate limiting, documentation, and at least 5 endpoints and GET, POST, PUT and DELETE
methods
- [ ] _Minor_ Use an ORM for the database
- [ ] _Minor_ Server-Side Rendering for improved performance and SEO
- [ ] _Minor_ Implement advanced search functionality with filters, sorting and
pagination
- [ ] _Minor_ File upload and management system
  - [ ] Support multiple file types (images, documents, etc.)
  - [ ] Client-side and server-side validation (type, size, format)
  - [ ] Secure file storage with proper access control
  - [ ] File preview functionality where applicable
  - [ ] Progress indicators for uploads
  - [ ] Ability to delete uploaded files
- [ ] _Minor_ Support for additional browsers
  - [ ] Full compatibility with at least 2 additional browsers (Firefox, Safari,
  Edge, etc.)
  - [ ] Test and fix all features in each browser
  - [ ] Document any browser-specific limitations
  - [ ] Consistent UI/UX across all supported browsers
- [ ] _Major_ Standard user management and authentication
  - [ ] Users can update their profile information
  - [ ] Users can upload an avatar (with a default avatar if none provided)
  - [ ] Users can add other users as friends and see their online status
  - [ ] Users have a profile page displaying their information
- [ ] _Minor_ GDPR compliance features
  - [ ] Allow users to request their data
  - [ ] Data deletion with confirmation
  - [ ] Export user data in a readable format
  - [ ] Confirmation emails for data operations

## Individual Contributions

_TODO_