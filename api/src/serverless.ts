import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let app: any;

export default async function (req: any, res: any) {
    if (!app) {
        const nestApp = await NestFactory.create(AppModule);
        nestApp.enableCors();
        // In Vercel, the path usually comes through directly. 
        // If we use rewrites properly, we might not need the global prefix, 
        // or we need to ensure it matches the rewrite destination.
        // For safety, we'll keep the prefix matching main.ts but we must match the vercel.json routes.
        nestApp.setGlobalPrefix('api');
        await nestApp.init(); // Important: init() instead of listen()
        app = nestApp.getHttpAdapter().getInstance();
    }
    return app(req, res);
}
