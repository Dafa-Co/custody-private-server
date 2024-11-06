import { applyDecorators, Injectable, Scope } from '@nestjs/common';

export const TransientService = () =>
  applyDecorators(
    Injectable({ scope: Scope.TRANSIENT })
  );
