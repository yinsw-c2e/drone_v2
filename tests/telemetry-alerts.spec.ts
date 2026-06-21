import { describe, expect, it } from 'vitest';
import type { Telemetry } from '@/models';
import { displayTelemetryAlert } from '@/utils/telemetry-alerts';

const frame: Telemetry = {
  ts: '2026-06-11T09:00:00.000Z',
  pos: { lng: 116.4815, lat: 39.9905 },
  altM: 27.1,
  speedMs: 8.333,
  batteryPct: 18.2,
  heading: 35,
  swingDeg: 11.2,
};

describe('telemetry alert display', () => {
  it('把低电量规则展示为可执行的中文提示', () => {
    const display = displayTelemetryAlert(['低电量'], frame, 'zh');
    expect(display?.title).toBe('低电量告警');
    expect(display?.notice).toBe('低电量 18.2% · 建议返航或就近降落');
  });

  it('0% 电量不再提示返航，改为就近降落或地面救援', () => {
    const display = displayTelemetryAlert(['低电量'], { ...frame, batteryPct: 0 }, 'zh');
    expect(display?.title).toBe('电量耗尽');
    expect(display?.notice).toBe('电量 0% · 停止返航，立即执行就近降落或地面救援');
  });

  it('10% 以内低电量提示立即就近降落', () => {
    const display = displayTelemetryAlert(['低电量'], { ...frame, batteryPct: 8.5 }, 'zh');
    expect(display?.title).toBe('危急低电量');
    expect(display?.notice).toBe('电量 8.5% · 停止远距离返航，立即就近降落');
  });

  it('支持英文低电量提示', () => {
    const display = displayTelemetryAlert(['低电量'], frame, 'en');
    expect(display?.title).toBe('Low battery');
    expect(display?.notice).toContain('18.2%');
    expect(display?.notice).toContain('Return');
  });

  it('按优先级展示其他遥测告警', () => {
    expect(displayTelemetryAlert(['偏航超过200米'], frame, 'zh')?.title).toBe('偏航告警');
    expect(displayTelemetryAlert(['吊框摆度过大'], frame, 'zh')?.notice).toContain('11.2°');
    expect(displayTelemetryAlert(['进入禁飞区'], frame, 'zh')?.notice).toContain('禁飞区');
  });

  it('没有已知告警时回退到原始告警内容', () => {
    expect(displayTelemetryAlert([], frame, 'zh')).toBeUndefined();
    expect(displayTelemetryAlert(['未知告警'], frame, 'zh')).toEqual({
      title: '遥测告警',
      notice: '未知告警',
    });
  });
});
