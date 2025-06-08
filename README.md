# MODSI-VRVisualization
VR Room Environment for visualization of company indicators data on 3D charts.
 
Example Input Data Structure (JSON):
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
                },
                {
                    "Id": 85,
                    "KPIId": 27,
                    "ChangedByUserId": 109,
                    "OldValue_1": "40",
                    "NewValue_1": "412",
                    "OldValue_2": "40",
                    "NewValue_2": "40",
                    "ChangedAt": "2025-06-07T11:59:00.17",
                    "Unit": "CO2/unit",
                    "ByProduct": true
                },
                {
                    "Id": 90,
                    "KPIId": 27,
                    "ChangedByUserId": 109,
                    "OldValue_1": "412",
                    "NewValue_1": "432",
                    "OldValue_2": "40",
                    "NewValue_2": "200",
                    "ChangedAt": "2024-06-07T12:09:00.82",
                    "Unit": "CO2/unit",
                    "ByProduct": true
                },
                {
                    "Id": 92,
                    "KPIId": 28,
                    "ChangedByUserId": 109,
                    "OldValue_1": "48",
                    "NewValue_1": "482",
                    "OldValue_2": "453",
                    "NewValue_2": "300",
                    "ChangedAt": "2025-06-07T12:10:04.133",
                    "Unit": "hours",
                    "ByProduct": true
                },
                {
                    "Id": 91,
                    "KPIId": 28,
                    "ChangedByUserId": 109,
                    "OldValue_1": "48",
                    "NewValue_1": "48",
                    "OldValue_2": null,
                    "NewValue_2": "453",
                    "ChangedAt": "2024-06-07T12:09:00.9",
                    "Unit": "hours",
                    "ByProduct": true
                },
                {
                    "Id": 87,
                    "KPIId": 4,
                    "ChangedByUserId": 109,
                    "OldValue_1": "30",
                    "NewValue_1": "34",
                    "OldValue_2": null,
                    "NewValue_2": null,
                    "ChangedAt": "2025-06-07T12:09:12.363",
                    "Unit": "minutes",
                    "ByProduct": true
                },
                {
                    "Id": 96,
                    "KPIId": 10,
                    "ChangedByUserId": 109,
                    "OldValue_1": "72",
                    "NewValue_1": "74",
                    "OldValue_2": "32",
                    "NewValue_2": "34",
                    "ChangedAt": "2025-06-07T12:10:51.34",
                    "Unit": "€",
                    "ByProduct": true
                },
                {
                    "Id": 0,
                    "KpiId": 11,
                    "ChangedByUserId": 0,
                    "NewValue_1": "89",
                    "NewValue_2": null,
                    "OldValue_1": null,
                    "OldValue_2": null,
                    "ChangedAt": "2025-06-08T15:53:26.030Z",
                    "Unit": "%",
                    "ByProduct": true
                }
            ],
            "charts": [
                {
                    "id": "chart-1749397845373",
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
                },
                {
                    "id": "chart-1749397863610",
                    "chartType": "babia-cyls",
                    "graphname": "Carbon Emissions vs. Output / Maintenance Activity Timeline & Impact",
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
                    "xAxis": "years",
                    "yAxis": "28",
                    "zAxis": "27",
                    "color": "#FF6384"
                },
                {
                    "id": "chart-1749397894941",
                    "chartType": "babia-pie",
                    "graphname": "Cycle Time / Maintenance Activity Timeline & Impact",
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
                    "yAxis": "28",
                    "zAxis": "4",
                    "color": "#4BC0C0"
                },
                {
                    "id": "chart-1749397984313",
                    "chartType": "babia-bubbles",
                    "graphname": "Operating Cash Flow / On-Time Delivery Rate",
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
                    "xAxis": "change",
                    "yAxis": "11",
                    "zAxis": "10",
                    "color": "#9370DB"
                }
            ],
            "activeChartId": "chart-1749397984313"
        }
    }
]
```
