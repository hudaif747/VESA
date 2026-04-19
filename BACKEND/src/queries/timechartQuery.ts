/**
 * This Query is used to get all the dataset_ids from the Dataset and STACCollection
 * that are within the given time range.
 *
 * @start - Start date of the time range
 * @end - End date of the time range
 *
 * @returns - Array of dataset_ids
 */

import { AQLQuery } from "../types/types";

export const timechartQuery: AQLQuery = `
LET startDate = @start
LET endDate = @end

LET Dataset_id_list = (
    FOR edge IN HasKeyword
        FILTER CONTAINS(edge._from, 'Dataset/')
        RETURN edge._from
)
LET DatasetID = UNIQUE(Dataset_id_list)

LET dLists = (
    FOR d IN Dataset
        FILTER (d._id IN DatasetID && d.temporal != null)
        LET start_date = d.temporal.start != null ? d.temporal.start : startDate
        LET end_date = d.temporal.end != null ? d.temporal.end : DATE_ADD(start_date, 1, "day")
        FILTER startDate <= end_date AND endDate >= start_date
        RETURN d._id
)

RETURN dLists
`;
