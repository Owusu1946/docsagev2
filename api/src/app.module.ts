import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocsModule } from './docs/docs.module';

@Module({
  imports: [DocsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
