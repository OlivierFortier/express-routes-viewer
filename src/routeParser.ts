import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { glob } from 'glob';
import { promisify } from 'util';

export interface Route {
    method: string;
    path: string;
    filePath: string;
    lineNumber: number;
}

export interface RouteParserConfig {
    includePattern: string;
    excludeFolders: string[];
    sortBy: 'method' | 'path' | 'file';
}

export class RouteParser {
    private static routeMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
    private routes: Route[] = [];

    constructor(private config: RouteParserConfig) {
        // Add test folders to exclude list if not already present
        const testPatterns = ['test', 'tests', '__tests__', '*.test.*', '*.spec.*'];
        this.config.excludeFolders = [...new Set([...this.config.excludeFolders, ...testPatterns])];
    }

    async parseRoutes(workspacePath: string): Promise<Route[]> {
        this.routes = [];
        await this.findFiles(workspacePath);
        return this.sortRoutes(this.routes);
    }

    private sortRoutes(routes: Route[]): Route[] {
        switch (this.config.sortBy) {
            case 'method':
                return [...routes].sort((a, b) => a.method.localeCompare(b.method));
            case 'path':
                return [...routes].sort((a, b) => a.path.localeCompare(b.path));
            case 'file':
                return [...routes].sort((a, b) => a.filePath.localeCompare(b.filePath));
            default:
                return routes;
        }
    }

    private async findFiles(dir: string) {
        try {
            const globPromise = promisify(glob);
            const files = await globPromise(this.config.includePattern, {
                cwd: dir,
                ignore: [
                    ...this.config.excludeFolders.map(folder => `**/${folder}/**`),
                    '**/*.test.*',
                    '**/*.spec.*',
                    '**/test/**',
                    '**/tests/**',
                    '**/__tests__/**'
                ],
                absolute: true
            });

            for (const filePath of files) {
                if (!this.isTestFile(filePath)) {
                    await this.parseFile(filePath);
                }
            }
        } catch (error) {
            console.error('Error finding files:', error);
            throw error;
        }
    }

    private isTestFile(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        return fileName.includes('.test.') ||
               fileName.includes('.spec.') ||
               filePath.includes('/test/') ||
               filePath.includes('/tests/') ||
               filePath.includes('/__tests__/');
    }

    private async parseFile(filePath: string) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        let baseRoute = '';
        let classBaseRoute = '';
        let routerVariables: Set<string> = new Set();
        let inRouterContext = false;

        // First pass: collect router variables
        lines.forEach(line => {
            const routerDef = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:express\.Router\(\)|express\(\)|Router\(\))/);
            if (routerDef) {
                routerVariables.add(routerDef[1]);
            }
        });

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip comments and empty lines
            if (line.startsWith('//') || line.startsWith('/*') || line === '') {
                continue;
            }

            // Check for router context
            inRouterContext = this.isRouterContext(line, routerVariables) || inRouterContext;

            // Check for class-level route decorators
            const controllerMatch = line.match(/@(?:Controller|Route|Router|JsonRouter)\s*\(['"]?(.*?)['"]?\)/);
            if (controllerMatch) {
                classBaseRoute = controllerMatch[1] || '';
                continue;
            }

            // Check for method decorators
            const decoratorMatch = line.match(/@(Get|Post|Put|Delete|Patch|Options|Head)\s*\(['"]?(.*?)['"]?\)/i);
            if (decoratorMatch) {
                const method = decoratorMatch[1].toUpperCase();
                const path = decoratorMatch[2] || '/';
                const fullPath = this.combinePaths(classBaseRoute, path);
                this.addRoute(method, fullPath, filePath, i + 1);
                continue;
            }

            // Check for router.use with path (base route)
            if (inRouterContext) {
                const useMatch = line.match(/\.use\(['"]([^'"]+)['"],/);
                if (useMatch) {
                    baseRoute = useMatch[1];
                    continue;
                }

                // Check for Express-style route definitions
                for (const method of RouteParser.routeMethods) {
                    // First check if this line starts a route definition
                    const routeStartRegex = new RegExp(`\\.(${method})\\s*\\(`);
                    if (routeStartRegex.test(line)) {
                        // Look for the route path in current and next lines
                        let routePath = '';
                        let lookAhead = 0;
                        const maxLookAhead = 5; // Look up to 5 lines ahead

                        // Combine current line with next few lines until we find the route path
                        while (lookAhead < maxLookAhead && i + lookAhead < lines.length) {
                            const combinedText = lines[i + lookAhead].trim();
                            const pathMatch = combinedText.match(/['"]([^'"]+)['"]/);
                            if (pathMatch) {
                                routePath = pathMatch[1];
                                break;
                            }
                            lookAhead++;
                        }

                        if (routePath && this.isValidRouteDefinition(line)) {
                            const fullPath = this.combinePaths(baseRoute, routePath);
                            this.addRoute(method.toUpperCase(), fullPath, filePath, i + 1);
                        }
                    }
                }
            }
        }
    }

    private isRouterContext(line: string, routerVariables: Set<string>): boolean {
        // Check if line contains express/router initialization or usage
        const routerPatterns = [
            /express\(\)/,
            /express\.Router\(\)/,
            /Router\(\)/,
            ...Array.from(routerVariables).map(v => new RegExp(`${v}\\.(get|post|put|delete|patch|use)`))
        ];
        return routerPatterns.some(pattern => pattern.test(line));
    }

    private isValidRouteDefinition(line: string): boolean {
        // Exclude common test patterns and non-route usages
        const invalidPatterns = [
            /expect\(/,
            /assert\(/,
            /test\(/,
            /describe\(/,
            /it\(/,
            /should\(/,
            /localStorage\.get/,
            /\.(get|post|put|delete|patch)Value/,
            /\.(get|post|put|delete|patch)Element/
        ];
        return !invalidPatterns.some(pattern => pattern.test(line));
    }

    private addRoute(method: string, path: string, filePath: string, lineNumber: number) {
        this.routes.push({ method, path, filePath, lineNumber });
    }

    private combinePaths(...paths: string[]): string {
        return paths
            .filter(p => p)
            .map(p => p.startsWith('/') ? p : '/' + p)
            .join('')
            .replace(/\/+/g, '/') || '/';
    }
}