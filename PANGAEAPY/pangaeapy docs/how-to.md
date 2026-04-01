# How To - pangaeapy 1.1.1.dev9+g0e632c1 documentation
[View this page](_sources/how_to.rst.txt "View this page")

Toggle table of contents sidebar

We always assume you have imported PanDataSet as

```
from pangaeapy import PanDataSet

```


Download a specific file from a binary data set
---------------------------------------------------------------------------------------------------------------------------

Got to the landing page of the data set (e.g. [https://doi.pangaea.de/10.1594/PANGAEA.956151](https://doi.pangaea.de/10.1594/PANGAEA.956151)), click on the “View dataset as HTML” button and get the row index (starting from 0) and the column name.

```
ds = PanDataSet(956151, enable_cache=True, cachedir='/your/cache/path')
filenames = ds.download(indices=[3], columns=["Binary"])

```


Download all files from a binary data set
---------------------------------------------------------------------------------------------------------------

Create a user account at [PANGAEA](https://www.pangaea.de/user/signup.php) and copy your bearer token from your [user page](https://www.pangaea.de/user/).

```
ds = PanDataSet(956151, enable_cache=True,
                cachedir='/your/cache/path',
                auth_token='your_personal_bearer_token')
filenames = ds.download()

```


Note

For tabular data sets no bearer token is required.

Set a custom cache directory
-------------------------------------------------------------------------------------

```
ds = PanDataSet(956151, enable_cache=True,
                cachedir='/path/to/your/storage')

```
