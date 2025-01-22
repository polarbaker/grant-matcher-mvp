const { MongoClient } = require('mongodb');

const sampleGrants = [
  {
    title: "Tech Innovation Fund",
    organization: "Silicon Valley Foundation",
    description: "Funding for innovative technology startups focusing on AI and sustainability",
    amount: { min: 50000, max: 150000, currency: "USD" },
    deadline: "2024-03-31",
    categories: ["Technology", "AI", "Sustainability"],
    eligibility: {
      regions: ["United States"],
      organizationTypes: ["Startup", "Small Business"]
    },
    status: "active"
  },
  {
    title: "Green Energy Grant",
    organization: "Climate Action Fund",
    description: "Supporting clean energy and environmental technology initiatives",
    amount: { min: 25000, max: 100000, currency: "USD" },
    deadline: "2024-04-15",
    categories: ["CleanTech", "Environment", "Energy"],
    eligibility: {
      regions: ["Global"],
      organizationTypes: ["Startup", "Nonprofit"]
    },
    status: "active"
  },
  {
    title: "Social Impact Innovation",
    organization: "Global Change Foundation",
    description: "Funding for startups addressing social challenges through technology",
    amount: { min: 75000, max: 200000, currency: "USD" },
    deadline: "2024-05-01",
    categories: ["Social Impact", "Technology", "Healthcare"],
    eligibility: {
      regions: ["North America", "Europe"],
      organizationTypes: ["Social Enterprise", "Startup"]
    },
    status: "active"
  }
];

async function seedGrants() {
  const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/grantmatcher';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('grantmatcher');
    const grantsCollection = db.collection('grants');

    // Clear existing grants
    await grantsCollection.deleteMany({});
    console.log('Cleared existing grants');

    // Insert sample grants
    const result = await grantsCollection.insertMany(sampleGrants);
    console.log(`Inserted ${result.insertedCount} grants`);

  } catch (error) {
    console.error('Error seeding grants:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

seedGrants();
