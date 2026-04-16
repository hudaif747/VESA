export interface IDataset {
  id: string;
  title: string;
  abstract: string | null;
  spatial: any | null;
  temporal: any | null;
  uri?: string;
}

export interface IAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  orcid?: string | null;
}

export interface IKeyword {
  id: string;
  name: string;
}

export interface IDataAdapter {
  dataset: IDataset;
  authors: IAuthor[];
  keywords: IKeyword[];
}
