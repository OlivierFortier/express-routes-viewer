# Express Routes Viewer

A VS Code extension that displays all your Express.js routes in a tree view.

## Features

- Lists all Express.js routes found in your project
- Shows HTTP method and full path for each route
- Click on a route to go to its definition
- Supports both Express router-style and decorator patterns
- Configurable file patterns and exclusions

## Supported Route Definitions

### Express Router Style
```javascript
app.get('/users', ...)
router.post('/users', ...)
```

### Decorator Style (e.g., NestJS, routing-controllers)
```typescript
@Controller('/api')
class UserController {
    @Get('/users')
    getUsers() {}

    @Post('/users')
    createUser() {}
}
```

## Configuration

- `expressRoutesViewer.includePattern`: Glob pattern for files to search (default: "**/*.{js,ts}")
- `expressRoutesViewer.excludeFolders`: Folders to exclude (default: ["node_modules", "dist", "build"])
- `expressRoutesViewer.sortBy`: Sort routes by "method", "path", or "file" (default: "path")

## Usage

1. Open your Express.js project in VS Code
2. Click the Routes icon in the Activity Bar
3. View all your routes in the side panel
4. Click the refresh button to update the route list

The extension automatically detects routes defined using Express router methods and method decorators.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes


---