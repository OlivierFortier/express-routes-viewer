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

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
