/**
 * Branding utility for nominal typing.
 * @example
 * type ResourceId = Brand<string, "ResourceId">;
 */
export type Brand<TBase, TBrand extends string> = TBase & { readonly __brand: TBrand };


