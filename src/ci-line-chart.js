import * as d3 from "d3";

const vis = {
  create: (element, config) => {
    // TODO: styles in here?
    // TODO: move some general setup to this fn?
  },

  updateAsync: (data, element, config, queryResponse, details, done) => {
    // console.log(data);
    // console.log(queryResponse);
    const width = element.clientWidth;
    const height = element.clientHeight;
    const margin = {
      top: 10,
      right: 10,
      bottom: 50,
      left: 50,
    };

    const svg = d3
      .select("#vis")
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},-${margin.bottom})`); // room for axis labels

    // const dimensions = queryResponse.fields.dimension_like;
    // const measure = queryResponse.fields.measure_like[0];

    // console.log(dimensions);
    // console.log(measure);

    // TODO: dynamically get the correct fields from the data
    // 	(the user should be able to select these fields from the Gear menu
    //	 and we retrieve them here)
    const d3data = data.map((row) => ({
      x: new Date(row[queryResponse.fields.dimensions[0].name].value),
      y: row[queryResponse.fields.measures[0].name].value,
      CI_left: row[queryResponse.fields.measures[1].name].value,
      CI_right: row[queryResponse.fields.measures[2].name].value,
      group_val: row[queryResponse.fields.dimensions[1].name].value,
    }));

    // console.log(d3data);

    // using d3.extent to do this automatically, but leaving in for now
    // in case this has some advantage...
    // calculate X domain
    // const dataX = d3data.map(d => d.x);
    // const minX = Math.floor(Math.min(...dataX));
    // const maxX = Math.ceil(Math.max(...dataX));

    // Y domain should use CI bounds (left/lower for min, right/upper for max)
    const minY = Math.floor(Math.min(...d3data.map((d) => d.CI_left)));
    const maxY = Math.ceil(Math.max(...d3data.map((d) => d.CI_right)));

    console.log(`X: [${minX}, ${maxX}]`);
    console.log(`Y: [${minY}, ${maxY}]`);

    // Add X axis --> it is a date format
    const x = d3
      .scaleTime()
      // .domain([minX, maxX]).nice()
      .domain(d3.extent(d3data, (d) => d.x))
      .nice()
      .range([0, width]);
    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x));

    // Add Y axis
    const y = d3
      .scaleLinear()
      .domain([minY, maxY])
      .nice()
      // .domain(d3.extent(d3data, d => d.y)).nice()
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // Setup lines for each group
    // TODO: dynamic lookup of the grouping field
    const groupName = queryResponse.fields.dimensions[1].name;
    const allGroups = data.map((d) => d[groupName].value);
    const groups = [...new Set(allGroups)]; // unique only

    // TODO: dynamic color range (user configurable?)
    // const color = d3.scaleOrdinal()
    // 	.domain(groups).range(['#cce5df88', '#ff000088']);

    groups.forEach((group, idx) => {
      // Filter data to the current group
      const subData = d3data.filter((d) => d.group_val === group);

      // console.log(subData);

      // Show confidence interval
      svg
        .append("path")
        .datum(subData)
        // .attr("fill", "#cce5df")
        // .attr("fill", d => color(d.key))
        .attr("fill", idx === 0 ? "#cce5df88" : "#ff000088")
        .attr("stroke", "none")
        .attr(
          "d",
          d3
            .area()
            .x((d) => x(d.x))
            .y0((d) => y(d.CI_right))
            .y1((d) => y(d.CI_left))
        );

      // Add the line
      svg
        .append("path")
        .datum(subData)
        .attr("fill", "none")
        // .attr("stroke", "steelblue")
        .attr("stroke", idx === 0 ? "steelblue" : "#881122")
        .attr("stroke-width", 1.5)
        .attr(
          "d",
          d3
            .line()
            .x((d) => x(d.x))
            .y((d) => y(d.y))
        );
    });

    done();
  },
};

looker.plugins.visualizations.add(vis);
