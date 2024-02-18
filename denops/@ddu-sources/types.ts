import { unknownutil as u } from "./deps.ts";

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

export const isActionData = u.isObjectOf({
  cmd: u.isString,
  path: u.isString,
  lineNr: u.isNumber,
  name: u.isString,
  desc: u.isString,
  summary: u.isString,
  up_to_date: u.isBoolean,
  location: u.isObjectOf({
    line: u.isNumber,
    column: u.isNumber,
    taskfile: u.isString,
  }),
});

export type ActionData = u.PredicateType<typeof isActionData>;

export type Note = {
  title?: string;
  path: string;
  name: string;
  relativePath: string;
};
