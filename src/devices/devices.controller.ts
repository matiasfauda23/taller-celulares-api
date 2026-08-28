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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import type { AuthenticatedRequest } from '../common/authenticated-request';
import { PaginationDto } from '../common/dto';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
@ApiTags('Devices')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('devices')
export class DevicesController {
  constructor(private s: DevicesService) {}
  @Post() @ApiCreatedResponse() create(
    @Req() r: AuthenticatedRequest,
    @Body() d: CreateDeviceDto,
  ) {
    return this.s.create(r.user.sub, d);
  }
  @Get() @ApiOkResponse() list(
    @Req() r: AuthenticatedRequest,
    @Query() q: PaginationDto,
  ) {
    return this.s.list(r.user.sub, q);
  }
  @Get(':id') get(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.s.get(r.user.sub, id);
  }
  @Patch(':id') update(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateDeviceDto,
  ) {
    return this.s.update(r.user.sub, id, d);
  }
  @Delete(':id') @HttpCode(200) archive(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.s.archive(r.user.sub, id);
  }
}
