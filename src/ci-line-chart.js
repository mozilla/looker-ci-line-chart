import * as d3 from "d3";

const vis = {
  options: {
    field_x: {
      type: "string",
      label: "X Axis Field",
      display: "select",
      placeholder: "Submission Date",
      order: 0,
      values: [],
    },
    field_y: {
      type: "string",
      label: "Y Axis Field",
      display: "select",
      placeholder: "Percentile",
      order: 1,
      values: [],
    },
    ci_lower: {
      type: "string",
      label: "Confidence Interval Lower",
      display: "select",
      placeholder: "Percentile Lower",
      order: 2,
      values: [],
    },
    ci_upper: {
      type: "string",
      label: "Confidence Interval Upper",
      display: "select",
      placeholder: "Percentile Upper",
      order: 3,
      values: [],
    }
  },

  create (element, config) {
    // TODO: styles in here?
    // TODO: move some general setup to this fn?
    this.svg = d3.select("#vis").append("svg")
  },

  updateAsync (data, element, config, queryResponse, details, done) {
    this.clearErrors();

    // Throw some errors and exit if the shape of the data isn't what this chart needs.
    // TODO: more error checks
    if (queryResponse.fields.dimensions.length === 0) {
      this.addError({
        title: "No Dimensions",
        message: "This chart requires dimensions.",
      });
      return;
    }
    
    // Fill in select options based on fields available
    const dim_options = queryResponse.fields.dimensions.map(d => ({ [`${d.label_short}`]: `${d.name}` }));
    const measure_options = queryResponse.fields.measures.map(d => ({ [`${d.label_short}`]: `${d.name}` }));

    let pivots = [];
    let pivotFieldNames = new Set();
    if ('pivots' in queryResponse) {
      pivots = queryResponse.pivots.map(d => ({ [`${d.label_short}`]: `${d.name}` }));
    }

    if (pivots.length === 0) {
      // placeholder for when no pivots are used
      pivotFieldNames.add("NONE");
    }

    this.options.field_x.values = [...dim_options, ...measure_options];
    this.options.field_y.values = measure_options;
    this.options.ci_lower.values = measure_options;
    this.options.ci_upper.values = measure_options;
    // register options with parent page to update visConfig
    this.trigger('registerOptions', this.options);

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

    const svg = this.svg
      .html('')
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
    if (!(config.field_x && config.field_y && config.ci_lower && config.ci_upper)) {
      this.addError({
        title: "Check Config",
        message: "This chart requires fields to be configured.",
      });
      return;
    }

    const d3data = data.flatMap((row) => {
      if (pivots.length === 0) {
        return {
          x: new Date(row[config.field_x].value),
          y: row[config.field_y].value,
          CI_left: row[config.ci_lower].value,
          CI_right: row[config.ci_upper].value,
          pivot: "NONE",
        }
      } else {
        let pivotEntries = Object.keys(row[config.field_y]);
        return pivotEntries.map(p => {
          pivotFieldNames.add(p);
          return {
            x: new Date(row[config.field_x].value),
            y: row[config.field_y][p].value,
            CI_left: row[config.ci_lower][p].value,
            CI_right: row[config.ci_upper][p].value,
            pivot: p
          }
        });
      }
    });

    // using d3.extent to do this automatically, but leaving calcs here
    // for now in case this has some advantage...
    // Calculate X domain
    // const dataX = d3data.map(d => d.x);
    // const minX = Math.floor(Math.min(...dataX));
    // const maxX = Math.ceil(Math.max(...dataX));

    // Y domain should use CI bounds (left/lower for min, right/upper for max)
    const minY = Math.floor(Math.min(...d3data.map((d) => d.CI_left)));
    const maxY = Math.ceil(Math.max(...d3data.map((d) => d.CI_right)));

    // console.log(`X: [${minX}, ${maxX}]`);
    // console.log(`Y: [${minY}, ${maxY}]`);

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

    // TODO: dynamic color range (user configurable?)
    // const color = d3.scaleOrdinal()
    // 	.domain(groups).range(['#cce5df68', '#ff000068']);

    Array.from(pivotFieldNames).forEach((group, idx) => {
      // Filter data to the current group
      const subData = d3data.filter((d) => d.pivot === group);

      // console.log(subData);

      // Show confidence interval
      svg
        .append("path")
        .datum(subData)
        // .attr("fill", "#cce5df")
        // .attr("fill", d => color(d.key))
        .attr("fill", idx === 0 ? "#cce5df68" : "#ff000068")
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
