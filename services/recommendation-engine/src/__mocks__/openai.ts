export class Configuration {
  constructor(_config: any) {}
}

export class OpenAIApi {
  constructor(_config: any) {}

  async createChatCompletion(_options: any) {
    const lastMessage = _options.messages[_options.messages.length - 1];
    
    // If it's a system message about being a grant matching expert, return a match score
    if (_options.messages[0].content.includes('grant matching expert')) {
      // Check if we have any preferences or profile data
      const hasPreferences = lastMessage.content.includes('User Preferences');
      const hasProfile = lastMessage.content.includes('User Profile');
      
      // Check if profile is empty when present
      const isEmptyProfile = hasProfile && 
        lastMessage.content.includes('Organization Type: \n') &&
        lastMessage.content.includes('Organization Size: \n') &&
        lastMessage.content.includes('Expertise: Not specified\n');
      
      const score = !hasPreferences && (!hasProfile || isEmptyProfile) ? 0.3 : 0.8;

      return {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                score,
                reasons: ["Mock reason 1", "Mock reason 2"]
              })
            }
          }]
        }
      };
    }
    
    // If it's about analyzing pitch decks, return an analysis
    if (_options.messages[0].content.includes('analyzing pitch decks')) {
      return {
        data: {
          choices: [{
            message: {
              content: JSON.stringify({
                summary: lastMessage.content || '',
                entities: {
                  organizations: [],
                  technologies: [],
                  markets: [],
                },
                key_topics: [],
              })
            }
          }]
        }
      };
    }
    
    throw new Error('Unknown message type');
  }
}
