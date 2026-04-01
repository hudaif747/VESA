# API Documentation - pangaeapy 1.1.1.dev9+g0e632c1 documentation
[View this page](_sources/api.rst.txt "View this page")

Toggle table of contents sidebar

pangaeapy is a package allowing to download and analyse metadata as well as data from tabular PANGAEA ([https://www.pangaea.de](https://www.pangaea.de/)) datasets.

_class_ pangaeapy.PanDataSet(_id\=None_, _paramlist\=None_, _deleteFlag\=''_, _enable\_cache\=False_, _cachedir\=None_, _include\_data\=True_, _expand\_terms\=\[\]_, _auth\_token\=None_, _cache\_expiry\_days\=1_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet)

PANGAEA DataSet The PANGAEA PanDataSet class enables the creation of objects which hold the necessary information, including data as well as metadata, to analyse a given PANGAEA dataset.

Parameters:

*   **id** (_str_) – The identifier of a PANGAEA dataset. An integer number or a DOI is accepted here
    
*   **deleteFlag** (_str_) – in case quality flags are avialable, this parameter defines a flag for which data should not be included in the data dataFrame. Possible values are listed here: [https://wiki.pangaea.de/wiki/Quality\_flag](https://wiki.pangaea.de/wiki/Quality_flag)
    
*   **enable\_cache** (_boolean_) – If set to True, PanDataSet objects are cached as pickle files either on the local home directory within a directory called ‘.pangaeapy\_cache’ or in cachedir given by the user in order to avoid unnecessary downloads.
    
*   **include\_data** (_boolean_) – determines if data table is downloaded and added to the self.data dataframe. If you are interested in metadata only set this to False
    
*   **expand\_terms** (_list_ _or_ _int_) – indicates if found ontology terms for parameters shall be expanded for the given list of terminology ids, i.p. add their hierarchy terms / classification
    

id

The identifier of a PANGAEA dataset. An integer number or a DOI is accepted here

Type:

int

uri

The PANGAEA DOI (alternative label)

Type:

str

doi

The PANGAEA DOI

Type:

str

title

The title of the dataset

Type:

str

abstract

the abstract or summary of the dataset

Type:

str

year

The publication year of the dataset

Type:

int

a list containing the PanAuthot objects (author info) of the dataset

Type:

list of PanAuthor

citation

the full citation of the dataset including e.g. author, year, title etc..

Type:

str

params

a list of all PanParam objects (the parameters) used in this dataset

Type:

list of PanParam

parameters

synonym for self.params

Type:

list of PanParam

events

a list of all PanEvent objects (the events) used in this dataset

Type:

list of PanEvent

projects

a list containing the PanProjects objects referenced by this dataset

Type:

list of PanProject

mintimeextent

a string containing the min time of data set extent

Type:

str

maxtimeextent

a string containing the max time of data set extent

Type:

str

data

a pandas dataframe holding all the data

Type:

pandas.DataFrame

loginstatus

a label which indicates if the data set is protected or not default value: ‘unrestricted’

Type:

str

isCollection

indicates if this dataset is a collection data set within a collection of child data sets

Type:

boolean

collection\_members

a list of DOIs of all child data sets in case the data set is a collection data set

Type:

list

moratorium

a label which provides the date until the dataset is under moratorium

Type:

str

datastatus

a label which provides the detail about the status of the dataset whether it is published or in review or deleted

Type:

str

registrystatus

a string which indicates the registration status of a dataset

Type:

str

licence

a licence object, usually creative commons

Type:

PanLicence

auth\_token

the PANGAEA auhentication token, you can find it at [https://www.pangaea.de/user/](https://www.pangaea.de/user/)

Type:

str

cache\_expiry\_days

the duration a cached pickle/cache is accepted, after this pangaeapy will load it again and ignor ethe cache

Type:

int

cachedir

the full path to the cache directory, will be created if it doesn’t exist

Type:

str

keywords

A list of keyword names. Only actual keywords, technical and auto-generated ones are ignored right now.

Type:

list\[str\]

check\_pickle()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.check_pickle)

Verifies if a cached pickle files needs to be refreshed (reloaded) Files are checked after 24 hrs earliest but only updated in case the metadata indicates changes occured

Parameters:

*   **expirydays**
    
*   **bool** (_Returns_)
    
*   **\-------**
    

download(_indices: list \= None_, _columns: list\[str\] \= None_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.download)

Download binary data if available; otherwise, save dataframe as CSV.

Downloads can be very large. Consider explicitly defining the pangaeapy cache when calling PanDataSet.

Parameters:

*   **indices** (_list_) – Row indices of the data to download (e.g. \[1, 2, 6\]).
    
*   **columns** (_list_ _of_ _strings_) – Column names of the data to download (e.g. \[“Binary”, “netCDF”\]).
    

Return type:

List of downloaded or saved filenames

from\_pickle()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.from_pickle)

Reads a PanDataSet object from a pickle file

getEventsAsFrame()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.getEventsAsFrame)

For more convenient handling of event info, this method returns a dataframe containing all events with their attributes as columns Please note that this version just takes campaign names, not other campaign attributes

getGeometry()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.getGeometry)

Sometimes the topotype attribute has not been set correctly during the curation process. This method returns the real geometry (topographic type) of the dataset based on the x,y,z and t information of the data frame content. Still a bit experimental..

getParamDict()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.getParamDict)

The method returns translates the parameter object list into a dictionary

info()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.info)

The method returns a set of basic information about the PANGAEA dataset

setData(_addEventColumns\=True_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.setData)

This method populates the data DataFrame with data from a PANGAEA dataset. In addition to the data given in the tabular ASCII file delivered by PANGAEA.

Parameters:

**addEventColumns** (_boolean_) – In case Latitude, Longitude, Elevation, Date/Time and Event are not given in the ASCII matrix, which sometimes is possible in single Event datasets, the setData could add these columns to the dataframe using the information given in the metadata for Event. Default is ‘True’

setID(_id_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.setID)

Initialize the ID of a data set in case it was not defined in the constructur :param id: The identifier of a PANGAEA dataset. An integer number or a DOI is accepted here :type id: str

setMetadata()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.setMetadata)

The method initializes the metadata of the PanDataSet object using the information of a PANGAEA metadata XML file.

to\_dwca(_save\=True_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.to_dwca)

This method creates a Darwin Core Archive file using PANGAEA metadata and data. A package will be saved as directory The method created directories are named as follows: \[PANGAEA ID\]\_dwca

Parameters:

*   **filelocation** (_str_) – Indicates the location (directory) where the DwC-A file will be saved
    
*   **save** (_Boolean_) – If the file shall be saved on disk (filelocation or home directory/pan\_export by default)
    

to\_frictionless(_filelocation\=None_, _save\=True_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.to_frictionless)

This method creates a frictionless data package ([https://specs.frictionlessdata.io/data-package](https://specs.frictionlessdata.io/data-package)) file using PANGAEA metadata and data. A package will be saved as directory The method created directories are named as follows: \[PANGAEA ID\]\_frictionless

Parameters:

*   **filelocation** (_str_) – Indicates the location (directory) where the frictionless file will be saved
    
*   **save** (_Boolean_) – If the file shall be saved on disk (filelocation or home directory/pan\_export by default)
    

to\_netcdf(_filelocation\=None_, _save\=True_, _type\='sdn'_)
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.to_netcdf)

This method creates a NetCDF file using PANGAEA data. It offers two different flavors: SeaDataNet NetCDF and an experimental internal format using NetCDF 4 groups. Currently, the method only supports simple types such as timeseries and profiles. The method created files are named as follows: \[PANGAEA ID\]\_\[type\].cf

Parameters:

*   **filelocation** (_str_) – Indicates the location (directory) where the NetCDF file will be saved
    
*   **type** (_str_) – This parameter sets the NetCDF profile type. Allowed values are ‘sdn’ (SeaDataNet) and ‘pan’ (PANGAEA style)
    
*   **save** (_Boolean_) – If the file shall be saved on disk (filelocation or home directory/pan\_export by default)
    

to\_pickle()
[\[source\]](about:blank/_modules/pangaeapy/pandataset.html#PanDataSet.to_pickle)

Writes a PanDataSet object to a pickle file

_class_ pangaeapy.PanQuery(_query_, _bbox\=None_, _limit\=10_, _offset\=0_)
[\[source\]](about:blank/_modules/pangaeapy/panquery.html#PanQuery)

Run and analyze results of PANGAEA search queries.

Parameters:

*   **query** (_str_) – The query string following the specs at www.pangaea.de.
    
*   **bbox** (_tuple_ _of_ _floats__,_ _optional_) – The bounding box to define geographical search constraints following the GeoJSON specs – (minlon, minlat, maxlon, maxlat).
    
*   **limit** (_int__,_ _default 10_) – The maximum number of results returned (cannot be higher than 500).
    
*   **offset** (_int__,_ _default 0_) – The offset of the search results.
    

totalcount

The number of total search results.

Type:

int

error

In case an error occurs this attribute holds the latest one.

Type:

str

query

The query provided by the user.

Type:

str

result

A list of retrieved search results.

Type:

list of dictionaries

get\_dois()
[\[source\]](about:blank/_modules/pangaeapy/panquery.html#PanQuery.get_dois)

Get the list of DOIs contained in the search result.

Returns:

A list of DOIs.

Return type:

list of str