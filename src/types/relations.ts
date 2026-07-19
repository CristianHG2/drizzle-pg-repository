export type RelationsForResource<
  T extends Record<`${string}For`, (id: string) => any>
> = {
  [K in keyof T as K extends `${infer Base}For` ? Base : never]: T[K] extends (
    id: string
  ) => infer R
    ? R
    : never;
};