import { HealthCheckEvalType, HealthCheckStatus } from './health-check.model';

/** 前端鏡像後端 HealthCheckEvaluator 的邏輯，讓「編輯中、尚未送出」的本季數值也能即時算出狀態。 */
export function evalHealthCheckStatus(
  evalType: HealthCheckEvalType,
  threshold: number | null,
  value: number | null,
): HealthCheckStatus {
  if (value === null || value === undefined) return 'NA';
  switch (evalType) {
    case 'BOOLEAN':
      return value !== 0 ? 'PASS' : 'FAIL';
    case 'GREATER_THAN':
      return threshold !== null && value > threshold ? 'PASS' : 'FAIL';
    case 'LESS_THAN':
      return threshold !== null && value < threshold ? 'PASS' : 'FAIL';
    default:
      return 'JUDGMENT';
  }
}
