# MongoDB Atlas Full User & Application Data Persistence Architecture

## Overview
The AI Manager platform connects directly to MongoDB Atlas (`cluster0.cgdh1pm.mongodb.net/ai_manager`) as the primary database store for all users, auth credentials, project workspaces, canvas diagrams, and system configurations, with automatic disk-mirroring fallback.

## Mongoose Schemas & Collections (`server/models/index.ts`)
1. **`users` (`UserModel`)**: Unique user accounts, bcrypt passwordHash, role (admin/user).
2. **`projects` (`ProjectModel`)**: Stores all projects, workspaces, and project metrics in MongoDB Atlas.
3. **`modules` (`ModuleModel`)**: Stores all project modules in MongoDB Atlas.
4. **`diagrams` (`DiagramModel`)**: Stores all Excalidraw diagrams, elements, and app state in MongoDB Atlas.
5. **`branch_flags` (`BranchFlagModel`)**: Stores git branch flags in MongoDB Atlas.
6. **`activity_logs` (`ActivityLogModel`)**: Stores all audit activity logs in MongoDB Atlas.
7. **`settings` (`SettingModel`)**: Stores all configuration in MongoDB Atlas.
8. **`db_connections` (`DbConnectionModel`)**: Stores all database connection definitions in MongoDB Atlas.
