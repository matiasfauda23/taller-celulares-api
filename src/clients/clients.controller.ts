import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from '../common/authenticated-request';
import { PaginationDto } from '../common/dto';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
@ApiTags('Clients')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'A valid access token is required' })
@ApiNotFoundResponse({ description: 'Client not found' })
@ApiConflictResponse({ description: 'Client cannot be archived or modified' })
@UseGuards(JwtAccessGuard)
@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}
  @Post()
  @ApiOperation({ summary: 'Create a client' })
  @ApiCreatedResponse()
  create(@Req() r: AuthenticatedRequest, @Body() d: CreateClientDto) {
    return this.service.create(r.user.sub, d);
  }
  @Get()
  @ApiOperation({ summary: 'List active clients' })
  @ApiOkResponse()
  list(@Req() r: AuthenticatedRequest, @Query() q: PaginationDto) {
    return this.service.list(r.user.sub, q);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a client, including an archived client' })
  @ApiOkResponse()
  get(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(r.user.sub, id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update an active client' })
  @ApiOkResponse()
  update(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateClientDto,
  ) {
    return this.service.update(r.user.sub, id, d);
  }
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive a client without active work orders' })
  @ApiOkResponse()
  archive(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.archive(r.user.sub, id);
  }
}
