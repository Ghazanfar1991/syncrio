// Team management API endpoints
import { NextRequest } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/middleware'
import { apiSuccess, apiError, validateRequest, schemas } from '@/lib/api-utils'
import { db } from '@/lib/db'
import { z } from 'zod'

// Team schemas
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
})

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER']).default('MEMBER')
})

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        // Get teams where user is owner or member
        const ownedTeams = await db.team.findMany({
          where: { ownerId: user.id },
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            _count: {
              select: { posts: true, members: true }
            }
          }
        })

        const memberTeams = await db.teamMember.findMany({
          where: { userId: user.id },
          include: {
            team: {
              include: {
                owner: {
                  select: { id: true, name: true, email: true }
                },
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true }
                    }
                  }
                },
                _count: {
                  select: { posts: true, members: true }
                }
              }
            }
          }
        })

        const teams = [
          ...ownedTeams.map((team: any) => ({ ...team, userRole: 'OWNER' })),
          ...memberTeams.map((member: any) => ({ ...member.team, userRole: member.role }))
        ]

        return apiSuccess({ teams })
      } catch (error) {
        console.error('Get teams error:', error)
        return apiError('Failed to fetch teams', 500)
      }
    })
  )(req)
}

export async function POST(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (req: NextRequest, user: any) => {
      try {
        const body = await req.json()
        // validateRequest throws on invalid input; catch in outer try/catch
        const { name, description } = validateRequest(createTeamSchema, body)

        // Check if user has permission to create teams (based on subscription)
        const userWithSubscription = await db.user.findUnique({
          where: { id: user.id },
          include: { subscription: true }
        })

        const teamLimits = {
          STARTER: 1,
          GROWTH: 3,
          BUSINESS: 10,
          AGENCY: 50
        }

        const currentTeamCount = await db.team.count({
          where: { ownerId: user.id }
        })

        const limit = teamLimits[userWithSubscription?.subscription?.tier as keyof typeof teamLimits] || 1
        
        if (currentTeamCount >= limit) {
          return apiError('Team limit reached. Please upgrade your plan.', 403)
        }

        // Create team
        const team = await db.team.create({
          data: {
            name,
            description,
            ownerId: user.id
          },
          include: {
            owner: {
              select: { id: true, name: true, email: true }
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            _count: {
              select: { posts: true, members: true }
            }
          }
        })

        return apiSuccess({ team }, 201)
      } catch (error) {
        console.error('Create team error:', error)
        return apiError('Failed to create team', 500)
      }
    })
  )(req)
}
