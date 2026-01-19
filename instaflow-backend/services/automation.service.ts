import { prisma } from "../prisma";
import { AutomationRequest } from "../types";

// Map frontend payload to Prisma schema field names
function mapPayloadToDbFields(data: any) {
  const mapped: any = {};

//   console.log("Data:", data);   
  
  // Direct mappings (same name in both)
  if (data.automationType !== undefined) mapped.automationType = data.automationType;
  if (data.scopeType !== undefined) mapped.scopeType = data.scopeType;
  if (data.scopeMediaId !== undefined) mapped.scopeMediaId = data.scopeMediaId;
  if (data.matchType !== undefined) mapped.matchType = data.matchType;
  if (data.intentLabel !== undefined) mapped.intentLabel = data.intentLabel;
  if (data.privateReplyText !== undefined) mapped.privateReplyText = data.privateReplyText;
  if (data.flowName !== undefined) mapped.flowName = data.flowName;
  
  // Handle both frontend and direct DB field names
  // triggerKeyword - can come as 'keyword' or 'triggerKeyword'
  if (data.triggerKeyword !== undefined) mapped.triggerKeyword = data.triggerKeyword;
  // triggerKeywords - array of keywords for multi-keyword support
  if (data.triggerKeywords !== undefined) mapped.triggerKeywords = data.triggerKeywords;
  
  // enablePublicReply - can come as 'isPublicReplyEnabled' or 'enablePublicReply'

  if (data.enablePublicReply !== undefined) mapped.enablePublicReply = data.enablePublicReply;
  
  // publicReplyText - can come as 'publicReply' or 'publicReplyText'
  if (data.publicReplyText !== undefined) mapped.publicReplyText = data.publicReplyText;
  
  // publicReplies - array of strings for randomized public replies
  if (data.publicReplies !== undefined) mapped.publicReplies = data.publicReplies;
  
  // isEnabled

  if (data.isEnabled !== undefined) mapped.isEnabled = data.isEnabled;
  

  // Also handle direct timing fields from AutomationRequest
  if (data.isAutomationTimingEnabled !== undefined) mapped.isAutomationTimingEnabled = data.isAutomationTimingEnabled;
  if (data.automationStartTime !== undefined) mapped.automationStartTime = data.automationStartTime;
  if (data.automationEndTime !== undefined) mapped.automationEndTime = data.automationEndTime;
  
  // Require follow feature
  if (data.requireFollow !== undefined) mapped.requireFollow = data.requireFollow;
  if (data.followPromptText !== undefined) mapped.followPromptText = data.followPromptText;
  
  // CTA Buttons for DM
  if (data.ctaButtons !== undefined) mapped.ctaButtons = data.ctaButtons;
  
  return mapped;
}



export class AutomationService {

    static async createAutomation(data: AutomationRequest, tenantId: string, igAccountId: string) {
       try {
        const mappedData = mapPayloadToDbFields(data);

        // console.log("Mapped Data:", mappedData);

        // Check if an automation already exists for this specific post (scopeType: POST)
        if (mappedData.scopeType === 'POST' && mappedData.scopeMediaId) {
            const existingAutomation = await prisma.automation.findFirst({
                where: {
                    tenantId,
                    igAccountId,
                    scopeType: 'POST',
                    scopeMediaId: mappedData.scopeMediaId,
                    isDeleted: false,
                },
            });

            if (existingAutomation) {
                throw new Error(`An automation already exists for this post. Please edit or delete the existing automation first.`);
            }
        }
        
        const automation = await prisma.automation.create({
            data: {
                tenantId,
                igAccountId,
                ...mappedData,
            },
        });

        return automation;
       } catch (err: any) {
           throw new Error(`Failed to create automation: ${err.message}`);
       }
    }

    static async listAutomations(tenantId: string) {
        return prisma.automation.findMany({
            where: { tenantId, isDeleted: false },
        });
    }

    static async updateAutomation(automationId: string, data: Partial<AutomationRequest>) {
        const mappedData = mapPayloadToDbFields(data);

        // console.log("Mapped Data:", mappedData);
        
        return prisma.automation.update({
            where: { id: automationId },
            data: mappedData,
        });
    }

    static async deleteAutomation(automationId: string) {
        return prisma.automation.update({
            where: { id: automationId },
            data: { isDeleted: true },
        });
    
    }
}