export interface GeographicExtent {
  west_bound_longitude: number | null;
  east_bound_longitude: number | null;
  south_bound_latitude: number | null;
  north_bound_latitude: number | null;
  mean_longitude: number | null;
  mean_latitude: number | null;
}

export interface IDataset {
  _key?: string;
  pangaea_id?: string;
  title: string;
  text_abstract: string | null;
  publication_date: string | null;
  uri: string;
  extent: {
    geographic: GeographicExtent;
    temporal: { min_date_time: string | null; max_date_time: string | null };
    elevation: { name: string; unit: string; min: number | null; max: number | null };
  };
  api_urls: { openaire: null; openalex: null; eudat: null };
}

export interface IAuthor {
  _key?: string;
  display_name: string;
  first_name: string;
  last_name: string;
  e_mail: string | null;
  uri: string | null;
  orcid: string | null;
}

export interface IKeyword {
  _key?: string;
  display_name: string;
  name: string;
}

export interface IDataAdapter {
  dataset: IDataset;
  authors: IAuthor[];
  keywords: IKeyword[];
}

/* 
// to be normalised to this in the future
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
*/
