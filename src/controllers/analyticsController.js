import analyticsDataClient, { ga4PropertyId } from '../config/ga4.js';

export const getRealtimeData = async (req, res, next) => {
  try {
    if (!analyticsDataClient || !ga4PropertyId) {
      return res.status(503).json({ 
        error: 'Google Analytics not configured' 
      });
    }

    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${ga4PropertyId}`,
      dimensions: [
        { name: 'country' },
        { name: 'city' },
      ],
      metrics: [
        { name: 'activeUsers' },
      ],
    });

    const data = response.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      city: row.dimensionValues[1].value,
      activeUsers: row.metricValues[0].value,
    })) || [];

    res.json({
      success: true,
      data,
      totalActiveUsers: data.reduce((sum, item) => sum + parseInt(item.activeUsers), 0),
    });
  } catch (error) {
    console.error('GA4 Realtime Error:', error);
    next(error);
  }
};

export const getHistoricalData = async (req, res, next) => {
  try {
    if (!analyticsDataClient || !ga4PropertyId) {
      return res.status(503).json({ 
        error: 'Google Analytics not configured' 
      });
    }

    const { startDate = '30daysAgo', endDate = 'today' } = req.query;

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${ga4PropertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'date' },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
    });

    const data = response.rows?.map(row => ({
      date: row.dimensionValues[0].value,
      activeUsers: row.metricValues[0].value,
      sessions: row.metricValues[1].value,
      pageViews: row.metricValues[2].value,
    })) || [];

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('GA4 Historical Error:', error);
    next(error);
  }
};
