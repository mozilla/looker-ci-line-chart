constant: vis_id {
    value: "ci-line-chart"
    export: override_optional
}
constant: vis_label {
    value: "Line Chart with Confidence Interval"
    export: override_optional
}
visualization: {
    id: "@{vis_id}"
    label: "@{vis_label}"
    file: "dist/ciLineChart.js"
    dependencies: []
}
