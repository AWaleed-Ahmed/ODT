# ODT API Documentation (GitHub Storage Backend)

## Environment Variables Setup
To use this API, you must configure the following Environment Variables in your Vercel project settings:
- `GITHUB_TOKEN`: A Personal Access Token (PAT) with write access to the target repository.
- `GITHUB_REPO`: The repository in format `username/repository-name`.
- `GITHUB_BRANCH`: The branch to commit files to (e.g. `main`).

## 1. Create Diagram (`/api/create_diagram`)
Creates a new diagram folder structure and generates a diagram ID.

**Request:**  
`POST /api/create_diagram`  
OR  
`GET /api/create_diagram`

**Example Request Body (Optional, JSON):**
```json
{
  "owner_id": "user_1",
  "name": "My Flowchart"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "diagram_id": "a1b2c3d4"
  }
}
```

## 2. Save Diagram (`/api/save_diagram`)
Saves elements, connectors, and styles to the designated diagram folder.

**Request:**  
`POST /api/save_diagram`  
**Content-Type:** `application/json`

**Example Request:**
```json
{
  "diagram_id": "101",
  "elements": [
    { "id": "el1", "type": "rectangle", "content": "Start" }
  ],
  "connectors": [
    { "id": "con1", "from": "el1", "to": "el2" }
  ],
  "styles": {
    "theme": "dark"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Saved successfully"
  }
}
```

## 3. Load Diagram (`/api/load_diagram`)
Loads diagram details.

**Request:**  
`GET /api/load_diagram?diagram_id=101`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "diagram_id": "101",
      "owner_id": "user_1",
      "name": "My Flowchart",
      "template": "flowchart",
      "created": "2026-04-01"
    },
    "elements": [
      { "id": "el1", "type": "rectangle", "content": "Start" }
    ],
    "connectors": [
      { "id": "con1", "from": "el1", "to": "el2" }
    ],
    "styles": {
      "theme": "dark"
    }
  }
}
```

## 4. Delete Diagram (`/api/delete_diagram`)
Deletes an entire diagram folder.

**Request:**  
`POST /api/delete_diagram` or `GET /api/delete_diagram?diagram_id=101`

**Example Request (POST JSON):**
```json
{
  "diagram_id": "101"
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Deleted successfully"
  }
}
```

## 5. List Diagrams (`/api/list_diagrams`)
Returns a list of all diagrams, optionally filtered by `user_id`.

**Request:**  
`GET /api/list_diagrams?user_id=user_1`

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "diagram_id": "101",
      "owner_id": "user_1",
      "name": "My Flowchart",
      "template": "flowchart",
      "created": "2026-04-01"
    }
  ]
}
```

## Note on Vercel Serverless File System Storage
While this satisfies your implementation requirements for manipulating files on disk in the `ODT_STORAGE` folder, please note that Vercel Serverless Functions have a **Read-Only** file system in production (with the exception of `/tmp`). 
The provided `os.makedirs` patterns will work perfectly when running locally using `vercel dev` or Flask, but will fail in a deployed environment on Vercel. For a production Vercel app, you will eventually want to swap out the `os` file operations with a cloud storage provider (like AWS S3) or a database (like Vercel Postgres, Supabase, or MongoDB).
