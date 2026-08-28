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
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrderQueryDto } from './dto/work-order-query.dto';
import { WorkOrdersService } from './work-orders.service';
@ApiTags('WorkOrders')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'A valid access token is required' })
@ApiNotFoundResponse({ description: 'Resource not found' })
@ApiConflictResponse({ description: 'Business rule conflict' })
@UseGuards(JwtAccessGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private s: WorkOrdersService) {}
  @Post()
  @ApiOperation({ summary: 'Create a work order in RECEIVED status' })
  @ApiCreatedResponse()
  create(@Req() r: AuthenticatedRequest, @Body() d: CreateWorkOrderDto) {
    return this.s.create(r.user.sub, d);
  }
  @Get()
  @ApiOperation({ summary: 'List and filter active work orders' })
  @ApiOkResponse()
  list(@Req() r: AuthenticatedRequest, @Query() q: WorkOrderQueryDto) {
    return this.s.list(r.user.sub, q);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a work order, including an archived order' })
  @ApiOkResponse()
  get(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.s.get(r.user.sub, id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update editable work-order details' })
  @ApiOkResponse()
  update(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateWorkOrderDto,
  ) {
    return this.s.update(r.user.sub, id, d);
  }
  @Patch(':id/status')
  @ApiOperation({ summary: 'Apply an allowed work-order status transition' })
  @ApiOkResponse()
  status(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateStatusDto,
  ) {
    return this.s.status(r.user.sub, id, d);
  }
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logically archive a final work order' })
  @ApiOkResponse()
  archive(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.s.archive(r.user.sub, id);
  }
}
