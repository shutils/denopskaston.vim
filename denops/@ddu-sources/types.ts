import { unknownutil as u } from "./deps.ts";

export const isNote = u.isObjectOf({
  title: u.isOptionalOf(u.isString),
  path: u.isString,
  name: u.isString,
  vault: u.isString,
});

export const isRgJsonMatch = u.isObjectOf({
  type: u.isString,
  data: u.isObjectOf({
    path: u.isObjectOf({
      text: u.isString,
    }),
    lines: u.isObjectOf({
      text: u.isString,
    }),
    submatches: u.isArrayOf(
      u.isObjectOf({
        match: u.isObjectOf({
          text: u.isString,
        }),
        start: u.isNumber,
        end: u.isNumber,
      }),
    ),
    line_number: u.isNumber,
    absolute_offset: u.isNumber,
    ...u.isUnknown,
  }),
  ...u.isUnknown,
});

export type Note = u.PredicateType<typeof isNote>;
