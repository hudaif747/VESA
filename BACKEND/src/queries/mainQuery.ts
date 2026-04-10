/*
  This query recieves a list of dataset_id
  from a POST request,
  and returns information about the PANGAEA dataset and STAC dataset
*/

import { AQLQuery } from "../types/types";

/*
          RESPONSE INTERFACE
    {
      id: string,
      locationData : {
        west_bound_longitude : number, 
        east_bound_longitude : number,
        north_bound_longitude : number, 
        south_bound_longitude : number, 
        mean_latitude : number,
        mean_longitude : number
      },
      doi : string,
      dataset_publication_date ?: string, // This is only for PANGAEA
      temporal_coverage : {
        start_date : string,
        end_date : string
      },
      authors ?: string[], // This is only for PANGAEA
      providers ?: string[], // This is only for STAC
      dataset_title : string
      organization : string
    }
*/

/**
 * @param keys - Array of dataset ids
 * @returns - Array of objects containing Dataset/STACCollection information
 */

export const mainQuery: AQLQuery = `
LET arrayList = @keys
LET array = FLATTEN(arrayList)

FOR a IN array
    // Only process keys belonging to the Dataset collection
    FILTER SPLIT(a, "/")[0] == 'Dataset'
    
    LET id = SPLIT(a, "/")[1]
    
    LET DATASETQUERY = (
        FOR dataset IN Dataset
            FILTER dataset._key == id
            LET Did = dataset._id
            
            // Fetch Author Names
            LET authorList = (
                FOR h IN HasAuthor
                    FILTER h._from == Did
                    RETURN h._to
            )
            LET authorNameList = (
                FOR al IN authorList
                    FOR author IN Author
                        FILTER al == author._id
                        RETURN CONCAT(author.first_name, ' ', author.last_name)
            )

            // Temporal Logic
            LET nullStart = (dataset.extent.temporal.min_date_time == null) ? null : dataset.extent.temporal.min_date_time
            LET endStart = (dataset.extent.temporal.max_date_time == null) ? null : dataset.extent.temporal.max_date_time

            // If start date is not null and end date is null, set end date to start date + 1 day
            LET start_date_1 = ((nullStart != null) && (endStart == null)) ? nullStart : dataset.extent.temporal.min_date_time
            LET end_date_1 = ((nullStart != null) && (endStart == null)) ? DATE_ADD(start_date_1, 1, "day") : dataset.extent.temporal.max_date_time

            // If start and end are identical, offset end date by 1 day
            LET start_date = start_date_1
            LET end_date = (start_date_1 == end_date_1) ? DATE_ADD(end_date_1, 1, "day") : end_date_1

            RETURN {
                id: dataset._id,
                location_data: {
                    west_bound_longitude: dataset.extent.geographic.west_bound_longitude,
                    east_bound_longitude: dataset.extent.geographic.east_bound_longitude,
                    north_bound_latitude: dataset.extent.geographic.north_bound_latitude,
                    south_bound_latitude: dataset.extent.geographic.south_bound_latitude,
                    mean_latitude: dataset.extent.geographic.mean_latitude,
                    mean_longitude: dataset.extent.geographic.mean_longitude
                },
                doi: dataset.uri,
                dataset_publication_date: dataset.publication_date,
                temporal_coverage: {
                    start_date: start_date,
                    end_date: end_date
                },
                authors: authorNameList,
                dataset_title: dataset.title,
                organization: 'PANGAEA'
            }
    )
    
    // Return only the first result of the dataset subquery
    RETURN FIRST(DATASETQUERY)`;
