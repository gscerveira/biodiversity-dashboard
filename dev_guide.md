# Detailed Porting Guide: Dash to Angular with D3.js for Corine Land Cover

## Implemented So Far

1. Basic project structure
2. MapComponent with D3.js integration
3. MapService skeleton

## 1. Map Functionality (replacing dash_leaflet)

### 1.1 Basic Map Setup
- **Implemented**: Basic map rendering with D3.js in MapComponent
- **To Do**: 
  - Implement map zoom and pan functionality
  - Add map tiles (replace `dl.TileLayer()`)

**Original Dash code:**
```python
dl.Map([
    dl.TileLayer(),
    dl.LayersControl(overlay_layers, id="lc")
], style={'height': '70vh'}, id="map")
```

### 1.2 GeoJSON Layers
- **To Do**:
  - Implement GeoJSON rendering (replace `dl.GeoJSON()`)
  - Add `zoomToBounds` functionality
  - Implement `onEachFeature` for tooltips

**Original Dash code:**
```python
shapes = [
    [dl.GeoJSON(url="/assets/data/Perimetri_SAV_NBFC.json", zoomToBounds=True), "Perimetri SAV"], 
    [dl.GeoJSON(url="/assets/data/ITA_adm2.json", zoomToBounds=True, onEachFeature=on_each_feature), "Regioni italiane"]
]

on_each_feature = assign("""function(feature, layer, context){
    layer.bindTooltip(`${feature.properties.NAME_2}`)
}""")
```

### 1.3 Layer Control
- **To Do**:
  - Create LayerControlComponent (replace `dl.LayersControl()`)
  - Implement base layer switching
  - Add overlay layer toggling

**Original Dash code:**
```python
base_layer = [dl.BaseLayer(dl.TileLayer(), name=key, checked=key == "toner") for key in keys]
overlay_layers = base_layer + [dl.Overlay(dl.LayerGroup(shape[0]), name=shape[1], checked=False) for shape in shapes]

dl.LayersControl(overlay_layers, id="lc")
```

## 2. Authentication (replacing dash_auth)

- **To Do**:
  - Implement AuthService for user authentication
  - Create login component
  - Add route guards for protected routes

**Original Dash code:**
```python
VALID_USERNAME_PASSWORD_PAIRS = {
    'hello': 'world'
}

auth = dash_auth.BasicAuth(
    app,
    VALID_USERNAME_PASSWORD_PAIRS
)
```

## 3. File Upload and Processing

### 3.1 File Upload Interface
- **To Do**:
  - Create FileUploadComponent (replace `dcc.Upload`)
  - Implement drag-and-drop functionality
  - Add file type selection dropdown

**Original Dash code:**
```python
dcc.Upload(
    id='upload-data',
    children=html.Div([
        'Drag and Drop or ',
        html.A('Select Files')
    ]),
    style={
        'width': '50%',
        'height': '60px',
        'lineHeight': '60px',
        'borderWidth': '1px',
        'borderStyle': 'dashed',
        'borderRadius': '5px',
        'textAlign': 'center',
        'margin': '10px'
    },
    multiple=True
)
```

### 3.2 File Processing
- **To Do**:
  - Implement file reading and parsing in FileUploadService
  - Handle different file types (JSON, Zipfile, GeoTIFF)
  - Process uploaded data for map display

**Original Dash code:**
```python
def parse_contents(contents, filename, date):
    content_type, content_string = contents.split(',')
    decoded = base64.b64decode(content_string)
    try:
        if 'json' in filename:
            # Assume that the user uploaded a json file
            content_dict = json.loads(decoded)
            return [dl.GeoJSON(data=content_dict), filename]
    except Exception as e:
        print(e)
        return html.Div([
            'There was an error processing this file.'
        ])
```

## 4. Data Visualization (replacing plotly.express)

### 4.1 Pie Chart
- **To Do**:
  - Create DataVisualizationComponent
  - Implement pie chart using D3.js (replace `px.pie()`)
  - Add interactivity and legend

**Original Dash code:**
```python
fig = px.pie(gdf2, values='CLC12_3L_2_area%', names=labels, color=gdf2.index, color_discrete_map=color_discrete_map)
```

### 4.2 Data Processing
- **To Do**:
  - Implement data aggregation in DataService (replace pandas operations)
  - Calculate percentages for chart data

**Original Dash code:**
```python
gdf2 = gdf.groupby([names]).agg(CLC12_3L_2_area=('AREA', np.sum))
gdf2['CLC12_3L_2_area%'] = gdf2['CLC12_3L_2_area'] / Total_area * 100
```

## 5. Geospatial Operations

- **To Do**:
  - Implement GeoJSON processing (replace geopandas functionality)
  - Add support for different coordinate systems and projections

**Original Dash code:**
```python
gdf = gpd.read_file("assets/data/CORINE_GEO.json", ignore_geometry=True)
gdf['label1'] = gdf['CLC12_3L_2'].str[0]
gdf['label2'] = gdf['CLC12_3L_2'].str[0:2]
Total_area = gdf['AREA'].sum()
```

## 6. Callbacks and Interactivity

### 6.1 Map Interactions
- **To Do**:
  - Implement hover effects for map features
  - Add click events for feature selection

**Original Dash code:**
```python
@app.callback(Output("info", "children"), Input("geojson", "hoverData"))
def info_hover(feature):
    return get_info(feature)
```

### 6.2 Data Updates
- **To Do**:
  - Create reactive data flow between map and charts
  - Implement dynamic updates based on user interactions

**Original Dash code:**
```python
@app.callback(
    Output("graph", "figure"), 
    Input("names", "value"),
    prevent_initial_call=True
)
def generate_chart(names):
    # Chart generation logic here
```

## 7. State Management

- **To Do**:
  - Implement state management using Angular signals
  - Replace Dash callbacks with Angular's reactive programming model

## 8. UI Components

### 8.1 Dropdown
- **To Do**:
  - Create custom dropdown component (replace `dcc.Dropdown`)
  - Implement file type selection functionality

**Original Dash code:**
```python
dcc.Dropdown(['Geojson(.json)', 'Zipfile (.zip) containing .shp, shx and .dbf files', 'GeoTiff (.tif, .tiff)'], id='demo-dropdown')
```

### 8.2 Info Display
- **To Do**:
  - Create InfoComponent for displaying feature information
  - Implement dynamic content updates

**Original Dash code:**
```python
def get_info(feature=None):
    header = [html.H4("CAMPI")]
    if not feature:
        return header + [html.P("Hoover over a state")]
    return header + [html.B(feature["properties"]["CLC12_3L_2"]), html.Br(),
                     "{:.3f} m".format(feature["properties"]["AREA"]), html.Sup("2")]
```

## Development Steps

1. Start with completing the Map Functionality (Section 1)
2. Move on to File Upload and Processing (Section 3)
3. Implement Data Visualization (Section 4)
4. Add Authentication (Section 2)
5. Work on Callbacks and Interactivity (Section 6)
6. Implement remaining sections in order of priority

Remember to commit your changes frequently and test each feature as you implement it. If you need more detailed guidance on any specific section, feel free to ask for elaboration or code examples.