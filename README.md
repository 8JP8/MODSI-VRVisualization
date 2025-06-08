# MODSI-VRVisualization
VR Room Environment for visualization of company indicators data on 3D charts.
 
Exemplo de Estrutura:
```
[
    {
        "name": "Configuração VR",
        "config": {
            "kpihistory": [
                {
                    "Id": 84,
                    "KPIId": 3,
                    "ChangedByUserId": 109,
                    "OldValue_1": "96.0",
                    "NewValue_1": "97",
                    "OldValue_2": null,
                    "NewValue_2": null,
                    "ChangedAt": "2025-06-07T11:59:00.247",
                    "Unit": "%",
                    "ByProduct": false
                },
                {
                    "Id": 83,
                    "KPIId": 3,
                    "ChangedByUserId": 109,
                    "OldValue_1": "95.0",
                    "NewValue_1": "96.0",
                    "OldValue_2": null,
                    "NewValue_2": null,
                    "ChangedAt": "2025-05-07T11:32:00.227",
                    "Unit": "%",
                    "ByProduct": false
                },
                {
                    "Id": 86,
                    "KPIId": 3,
                    "ChangedByUserId": 109,
                    "OldValue_1": "97",
                    "NewValue_1": "45",
                    "OldValue_2": null,
                    "NewValue_2": null,
                    "ChangedAt": "2024-06-07T12:09:00.453",
                    "Unit": "%",
                    "ByProduct": false
                }
            ],
            "charts": [
                {
                    "id": "chart-1749397019425",
                    "chartType": "babia-bars",
                    "graphname": "Customer Satisfaction",
                    "position": {
                        "x": 0,
                        "y": 1,
                        "z": -2,
                        "scale": 1,
                        "width": 1,
                        "height": 1,
                        "depth": 1,
                        "rotation": {
                            "x": 0,
                            "y": 0,
                            "z": 0
                        }
                    },
                    "xAxis": "months",
                    "yAxis": "",
                    "zAxis": "3",
                    "color": "#1E90FF"
                }
            ],
            "activeChartId": "chart-1749397019425"
        }
    }
]
```
