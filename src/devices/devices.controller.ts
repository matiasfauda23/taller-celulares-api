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
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
@ApiTags('Devices')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'A valid access token is required' })
@ApiNotFoundResponse({ description: 'Device or owner client not found' })
@ApiConflictResponse({ description: 'Device cannot be archived or modified' })
@UseGuards(JwtAccessGuard)
@Controller('devices')
export class DevicesController {
  constructor(private s: DevicesService) {}
  @Post()
  @ApiOperation({ summary: 'Create a device for an active client' })
  @ApiCreatedResponse()
  create(@Req() r: AuthenticatedRequest, @Body() d: CreateDeviceDto) {
    return this.s.create(r.user.sub, d);
  }
  @Get()
  @ApiOperation({ summary: 'List active devices' })
  @ApiOkResponse()
  list(@Req() r: AuthenticatedRequest, @Query() q: PaginationDto) {
    return this.s.list(r.user.sub, q);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a device, including an archived device' })
  @ApiOkResponse()
  get(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.s.get(r.user.sub, id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update an active device' })
  @ApiOkResponse()
  update(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateDeviceDto,
  ) {
    return this.s.update(r.user.sub, id, d);
  }
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Archive a device without active work orders' })
  @ApiOkResponse()
  archive(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.s.archive(r.user.sub, id);
  }
}
