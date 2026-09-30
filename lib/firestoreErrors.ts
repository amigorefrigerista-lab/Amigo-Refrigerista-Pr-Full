import { supabase } from '@/lib/supabase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  
  supabase.auth.getUser().then(({ data }) => {
    if (data?.user) {
      errInfo.authInfo.userId = data.user.id;
      errInfo.authInfo.email = data.user.email;
    }
  }).catch(() => {});

  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Compatibilidade retroativa
export const handleFirestoreError = handleDatabaseError;
