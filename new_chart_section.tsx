                      <div className="p-6">
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart
                              data={generateYearlyRentalData(
                                projection.calculationResults?.rentalYield?.rentalYieldYearly,
                                projection.calculationResults?.financiamentoPlanta?.resumo?.prazoEntrega || 36,
                                selectedTimeframe
                              )}
                              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                              <XAxis 
                                dataKey="year" 
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748B' }}
                              />
                              <YAxis 
                                yAxisId="left"
                                tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                width={60}
                              />
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                                axisLine={{ stroke: '#E2E8F0' }}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748B' }}
                                width={60}
                              />
                              <ChartTooltip 
                                formatter={(value, name) => {
                                  if (name === "rentalIncome") return [formatCurrency(value), "Renda Bruta"];
                                  if (name === "expenses") return [formatCurrency(value), "Despesas"];
                                  if (name === "netIncome") return [formatCurrency(value), "Renda Líquida"];
                                  return [value, name];
                                }}
                                contentStyle={{ 
                                  borderRadius: '6px', 
                                  border: '1px solid #E2E8F0',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                                labelFormatter={(label) => `Ano ${label}`}
                              />
                              <Legend 
                                align="right"
                                verticalAlign="top"
                                iconType="circle"
                                iconSize={10}
                                formatter={(value) => {
                                  if (value === "rentalIncome") return "Renda Bruta";
                                  if (value === "expenses") return "Despesas";
                                  if (value === "netIncome") return "Renda Líquida";
                                  return value;
                                }}
                              />
                              <Bar 
                                dataKey="rentalIncome" 
                                name="rentalIncome"
                                stackId="a"
                                yAxisId="left"
                                fill="#4ADE80" 
                                radius={[4, 4, 0, 0]} 
                                barSize={30}
                              />
                              <Bar 
                                dataKey="expenses" 
                                name="expenses"
                                stackId="a"
                                yAxisId="left"
                                fill="#F87171" 
                                radius={[4, 4, 0, 0]} 
                                barSize={30}
                              />
                              <Line
                                type="monotone"
                                dataKey="netIncome"
                                name="netIncome"
                                yAxisId="right"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ r: 4, stroke: '#3B82F6', strokeWidth: 2, fill: 'white' }}
                              />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>