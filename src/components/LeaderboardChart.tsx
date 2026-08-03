import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LeaderboardChartProps {
  users: any[];
}

const LeaderboardChart: React.FC<LeaderboardChartProps> = ({ users }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!users || users.length === 0 || !svgRef.current || !containerRef.current) return;

    // We will generate fake history for the top 5 players based on their current points
    const topUsers = users.slice(0, 5);
    
    // Generate 10 time steps (weeks/months)
    const timeSteps = 10;
    
    interface ChartPlayerData {
      id: string;
      name: string;
      history: { date: number, value: number }[];
    }

    // Create random history logic
    const data: ChartPlayerData[] = topUsers.map((user, index) => {
      const finalPoints = user.stats?.points || 0;
      const history = [];
      let currentPoints = Math.round(finalPoints * 0.1); // Start with 10%
      
      for (let i = 0; i < timeSteps; i++) {
        if (i === 0) {
            history.push({ date: i, value: currentPoints });
        } else if (i === timeSteps - 1) {
            history.push({ date: i, value: finalPoints });
        } else {
           const progress = i / (timeSteps - 1);
           const expectedPoints = finalPoints * progress;
           const variance = finalPoints * 0.1 * (Math.random() - 0.5); // +/- 5% variance
           currentPoints = Math.max(currentPoints, Math.round(expectedPoints + variance));
           history.push({ date: i, value: currentPoints });
        }
      }
      return {
        id: user.id,
        name: user.displayName || 'Jugador',
        history
      };
    });

    const width = containerRef.current.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 140, bottom: 40, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("width", width).attr("height", height);
    
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([0, timeSteps - 1])
      .range([0, innerWidth]);

    const maxPoints = d3.max(data, d => d3.max(d.history, h => h.value)) || 100;
    
    const y = d3.scaleLinear()
      .domain([0, maxPoints * 1.1])
      .range([innerHeight, 0]);

    const line = d3.line<{date: number, value: number}>()
      .curve(d3.curveMonotoneX)
      .x(d => x(d.date))
      .y(d => y(d.value));

    // Axes
    const xAxis = d3.axisBottom(x).ticks(timeSteps).tickFormat(d => `S${Number(d) + 1}`);
    const yAxis = d3.axisLeft(y).ticks(5);

    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", "#666")
      .style("font-family", "monospace")
      .style("font-size", "10px")
      .call(g => g.select(".domain").attr("stroke", "#333"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#333"));

    g.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .attr("color", "#666")
      .style("font-family", "monospace")
      .style("font-size", "10px")
      .call(g => g.select(".domain").attr("stroke", "#333"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#333"));
      
    // Add grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.05)
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => ""))
      .attr("color", "#fff");

    // Cyberpunk neon colors
    const colors = ["#0ea5e9", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];

    // Draw lines with animation
    const paths = g.selectAll(".line")
      .data(data)
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", (d, i) => colors[i % colors.length])
      .attr("stroke-width", 3)
      .style("filter", "drop-shadow(0px 0px 4px rgba(255,255,255,0.3))")
      .attr("d", d => line(d.history));

    // Animate lines drawing
    paths.each(function(d) {
        const path = d3.select(this);
        const totalLength = (this as SVGPathElement).getTotalLength();
        
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(3000)
          .ease(d3.easeQuadInOut)
          .attr("stroke-dashoffset", 0);
    });

    // Add labels at the end of the line
    const labels = g.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", innerWidth + 12)
      .attr("y", d => y(d.history[timeSteps - 1].value))
      .text(d => d.name)
      .attr("fill", (d, i) => colors[i % colors.length])
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("font-family", "sans-serif")
      .attr("alignment-baseline", "middle")
      .attr("opacity", 0);

    labels.transition()
      .delay(3000)
      .duration(500)
      .attr("opacity", 1);
      
    // Add dots
    const dots = g.selectAll(".dots")
      .data(data)
      .enter()
      .append("g")
      .attr("fill", (d, i) => colors[i % colors.length]);
      
    dots.selectAll("circle")
      .data(d => d.history)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.value))
      .attr("r", 4)
      .attr("opacity", 0)
      .style("filter", "drop-shadow(0px 0px 4px rgba(255,255,255,0.5))")
      .transition()
      .delay((d, i) => (i / timeSteps) * 3000)
      .duration(200)
      .attr("opacity", 1);

    // Add a tooltip
    const tooltip = d3.select(containerRef.current)
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(9, 9, 11, 0.9)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border", "1px solid rgba(255,255,255,0.1)")
      .style("border-radius", "8px")
      .style("font-size", "12px")
      .style("font-family", "monospace")
      .style("font-weight", "bold")
      .style("pointer-events", "none")
      .style("z-index", "10")
      .style("backdrop-filter", "blur(4px)");

    dots.selectAll("circle")
      .on("mouseover", function(event, d: any) {
        d3.select(this).attr("r", 8);
        tooltip.html(`Puntos: <span style="color:#0ea5e9">${d.value}</span>`)
          .style("visibility", "visible");
      })
      .on("mousemove", function(event) {
        // get bounding rect to position relative to container
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            tooltip
              .style("top", (event.clientY - rect.top - 40) + "px")
              .style("left", (event.clientX - rect.left + 15) + "px");
        }
      })
      .on("mouseout", function() {
        d3.select(this).attr("r", 4);
        tooltip.style("visibility", "hidden");
      });

    // Handle Resize
    const handleResize = () => {
        // Simple re-render trigger by emptying and letting it redraw if we had a resize state,
        // but here we can just leave it as SVG scales down or we can rely on the user refreshing.
        // For a full responsive D3 we usually wrap in a resize observer that updates state.
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      d3.select(containerRef.current).selectAll(".d3-tooltip").remove();
    };

  }, [users]);

  return (
    <div className="glass rounded-3xl border border-white/10 p-6 flex flex-col gap-4">
      <h2 className="text-xl font-display uppercase tracking-widest text-primary">Progresión Histórica</h2>
      <div ref={containerRef} className="w-full relative h-[400px]">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};

export default LeaderboardChart;
