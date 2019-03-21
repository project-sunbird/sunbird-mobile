// @ts-ignore
declare var db: {
  init: (dbName, dbVersion, migrations, callback) => void,
  open: (dbFilePath, success, error) => void,
  read: (distinct: boolean,
         table: string,
         columns: Array<string>,
         selection: string,
         selectionArgs: Array<string>,
         groupBy: string,
         having: string,
         orderBy: string,
         limit: string,
         useExternalDb: boolean,
         success,
         error) => void,
  execute: (query: string, useExternalDb: boolean, success, error) => void,
  insert: (table: string, model: string, useExternalDb: boolean, success, error) => void,
  update: (table: string,
           selection: string,
           selectionArgs: Array<string>,
           model,
           useExternalDb: boolean,
           success,
           error) => void,
  beginTransaction: () => void,
  endTransaction: (isOperationSuccessful: boolean,
                   useExternalDb: boolean) => void,
  copyDatabase: (detination, success, error) => void,
};
