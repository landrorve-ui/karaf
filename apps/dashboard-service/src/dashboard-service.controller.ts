import { BadRequestException, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { requestIdFromHeaders } from '@lib/common';
import { DashboardServiceService } from './dashboard-service.service';

@Controller()
export class DashboardServiceController {
  constructor(private readonly dashboardServiceService: DashboardServiceService) {}

  @Get()
  health(): { status: string; service: string } {
    return { status: 'ok', service: 'dashboard-service' };
  }

  @Get('temperatures')
  async temperatures(
    @Headers() headers: Record<string, unknown>,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const now = Date.now();
    return this.dashboardServiceService.getTemperature({
      requestId: requestIdFromHeaders(headers),
      from: this.parseDate(from, new Date(now - 60 * 60 * 1000)),
      to: this.parseDate(to, new Date(now)),
      deviceId,
    });
  }

  @Get('room-usage')
  async roomUsage(
    @Headers() headers: Record<string, unknown>,
    @Query('date') date?: string,
  ) {
    return this.dashboardServiceService.getRoomUsage({
      requestId: requestIdFromHeaders(headers),
      date: this.parseDate(date, new Date()),
    });
  }

  @Post('aggregations/run')
  async runAggregations(@Headers() headers: Record<string, unknown>) {
    return this.dashboardServiceService.runAggregations(requestIdFromHeaders(headers));
  }

  private parseDate(value: string | undefined, fallback: Date): Date {
    if (!value) {
      return fallback;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('invalid date');
    }

    return date;
  }
}
