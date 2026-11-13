/**
 * 结果页路由状态类型
 * 供 useResultRoute / useResultsData 等 composable 共用
 */

export interface DatasetRouteState {
  type: 'real' | 'simulation';
  id?: string | undefined;
  shape?: string | undefined;
  size?: string | undefined;
}

export interface MethodRouteState {
  tool?: string | undefined;
}

export type ResultRouteState =
  | {
      mode: 'by-dataset';
      dataset: DatasetRouteState;
      method?: never;
    }
  | {
      mode: 'by-method';
      method: MethodRouteState;
      dataset?: never;
    };
