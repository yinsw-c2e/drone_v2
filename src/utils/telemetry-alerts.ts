import type { Telemetry } from '@/models';

export type TelemetryAlertLocale = 'en' | 'zh';

export interface TelemetryAlertDisplay {
  title: string;
  notice: string;
}

const ALERT_LOW_BATTERY = '低电量';
const ALERT_ROUTE_DEVIATION = '偏航超过200米';
const ALERT_SWING = '吊框摆度过大';
const ALERT_NO_FLY_ZONE = '进入禁飞区';

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

export function displayTelemetryAlert(
  alerts: string[],
  frame: Telemetry | undefined,
  locale: TelemetryAlertLocale,
): TelemetryAlertDisplay | undefined {
  if (!alerts.length) return undefined;

  const isZh = locale === 'zh';

  if (alerts.includes(ALERT_LOW_BATTERY)) {
    const pct = frame?.batteryPct;
    const battery = pct !== undefined ? ` ${formatMetric(pct)}%` : '';
    if (pct !== undefined && pct <= 0) {
      return {
        title: isZh ? '电量耗尽' : 'Battery depleted',
        notice: isZh
          ? '电量 0% · 停止返航，立即执行就近降落或地面救援'
          : 'Battery 0% · Stop return flight and execute nearest landing or ground recovery',
      };
    }
    if (pct !== undefined && pct <= 10) {
      return {
        title: isZh ? '危急低电量' : 'Critical battery',
        notice: isZh
          ? `电量${battery} · 停止远距离返航，立即就近降落`
          : `Battery${battery} · Stop long-distance return and land immediately`,
      };
    }
    return {
      title: isZh ? '低电量告警' : 'Low battery',
      notice: isZh
        ? `低电量${battery} · 建议返航或就近降落`
        : `Low battery${battery} · Return or land at the nearest safe point`,
    };
  }

  if (alerts.includes(ALERT_ROUTE_DEVIATION)) {
    return {
      title: isZh ? '偏航告警' : 'Route deviation',
      notice: isZh
        ? '偏航超过 200m · 请核对航线，必要时返航'
        : 'Route deviation exceeds 200m · Check the route or return if needed',
    };
  }

  if (alerts.includes(ALERT_SWING)) {
    const swing = frame ? ` ${formatMetric(frame.swingDeg)}°` : '';
    return {
      title: isZh ? '吊框摆度告警' : 'Payload swing',
      notice: isZh
        ? `吊框摆度过大${swing} · 请减速并稳定载荷`
        : `Payload swing is high${swing} · Slow down and stabilize the load`,
    };
  }

  if (alerts.includes(ALERT_NO_FLY_ZONE)) {
    return {
      title: isZh ? '禁飞区告警' : 'No-fly zone',
      notice: isZh
        ? '已进入禁飞区 · 请立即脱离限制区域'
        : 'No-fly zone entered · Leave the restricted area immediately',
    };
  }

  return {
    title: isZh ? '遥测告警' : 'Telemetry alert',
    notice: alerts.join(' · '),
  };
}
