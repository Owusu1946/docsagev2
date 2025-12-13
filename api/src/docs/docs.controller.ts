import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { DocsService } from './docs.service';

interface GenerateDocsDto {
    repoUrl: string;
}

@Controller('docs')
export class DocsController {
    constructor(private readonly docsService: DocsService) { }

    @Post('generate')
    async generateDocs(@Body() body: GenerateDocsDto) {
        if (!body.repoUrl) {
            throw new BadRequestException('repoUrl is required');
        }
        return this.docsService.generateDocs(body.repoUrl);
    }
}
