import { Injectable } from '@nestjs/common';

export interface CommentaryEvent {
  minute: number;
  type: string;
  text: string;
  importance: 'low' | 'medium' | 'high';
  teamId?: string;
  playerId?: string;
  playerName?: string;
}

@Injectable()
export class CommentaryService {
  // Football Manager-style commentary templates with variations
  private commentaryTemplates = {
    // Possession & Build-up
    possession_change: [
      '{team} win the ball back',
      '{team} regain possession',
      'Ball recovered by {team}',
      '{team} intercept the pass',
    ],
    buildup: [
      '{team} building from the back',
      '{team} looking to create something',
      'Patient build-up play from {team}',
      '{team} probing for an opening',
    ],
    
    // Passing
    pass_completed: [
      'Nice pass by {player}',
      '{player} finds his teammate',
      'Good ball from {player}',
      '{player} with the simple pass',
    ],
    key_pass: [
      'Great ball by {player}!',
      '{player} threads it through!',
      'Excellent vision from {player}!',
      '{player} with a defense-splitting pass!',
    ],
    pass_intercepted: [
      'Intercepted by {player}',
      '{player} reads it well',
      'Cut out by {player}',
      '{player} nips in to steal it',
    ],

    // Shooting & Goals
    shot_off_target: [
      '{player} shoots wide',
      '{player}\'s effort goes off target',
      '{player} blazes it over',
      'Shot from {player} misses the target',
    ],
    shot_on_target: [
      '{player} shoots! Saved by the keeper',
      'Good attempt from {player}, keeper saves',
      '{player}\'s shot is kept out',
      'Keeper denies {player}',
    ],
    shot_blocked: [
      'Blocked by the defense!',
      'Defender throws himself in front of it',
      'Brave block from {player}',
      '{player} blocks the shot',
    ],
    goal: [
      '⚽ GOAL! {player} scores for {team}!',
      '⚽ {player} finds the net! {team} lead!',
      '⚽ It\'s in! {player} scores!',
      '⚽ Goal for {team}! {player} with the finish!',
    ],
    goal_header: [
      '⚽ GOAL! {player} heads it in!',
      '⚽ Header! {player} scores!',
      '⚽ {player} rises highest to head home!',
    ],
    goal_long_range: [
      '⚽ GOAL! What a strike from {player}!',
      '⚽ Screamer! {player} from distance!',
      '⚽ Thunderbolt! {player} scores from long range!',
    ],
    goal_penalty: [
      '⚽ GOAL! {player} converts from the spot',
      '⚽ Penalty scored by {player}',
      '⚽ {player} makes no mistake from 12 yards',
    ],

    // Near Misses
    hit_post: [
      'Off the post! So close from {player}!',
      '{player} hits the woodwork!',
      'Post! {player} is denied by the frame!',
      'The post saves the keeper! {player} unlucky',
    ],
    hit_crossbar: [
      'Off the crossbar! {player} almost scored!',
      'Bar! {player} rattles the crossbar!',
      '{player} hits the bar! What a strike!',
      'Crossbar denies {player}!',
    ],
    just_wide: [
      'Just wide from {player}!',
      '{player}\'s effort inches past the post',
      'So close! {player} nearly found the corner',
      '{player} almost found the target',
    ],

    // Saves
    routine_save: [
      'Comfortable save for the keeper',
      'Keeper gathers it easily',
      'No problem for the goalkeeper',
      'Routine stop',
    ],
    good_save: [
      'Good save by the keeper!',
      'Keeper does well to keep it out',
      'Nice stop from the goalkeeper',
      'Keeper reacts quickly',
    ],
    great_save: [
      'WHAT A SAVE!',
      'Incredible save by the keeper!',
      'Outstanding keeping!',
      'How did that stay out?!',
    ],

    // Set Pieces
    corner_won: [
      'Corner kick for {team}',
      '{team} win a corner',
      'Corner to {team}',
    ],
    corner_cleared: [
      'Corner cleared away',
      'Headed clear',
      'Defense clears the danger',
    ],
    freekick_awarded: [
      'Free kick awarded to {team}',
      '{team} have a free kick in a dangerous area',
      'Set piece opportunity for {team}',
    ],
    freekick_cleared: [
      'Free kick comes to nothing',
      'Wall does its job',
      'Cleared by the defense',
    ],

    // Fouls & Cards
    foul: [
      'Foul by {player}',
      '{player} brings him down',
      'Free kick given against {player}',
      '{player} penalized for that challenge',
    ],
    yellow_card: [
      '🟨 Yellow card for {player}',
      '🟨 {player} is booked',
      '🟨 Caution for {player}',
      '🟨 {player} goes into the book',
    ],
    red_card: [
      '🟥 RED CARD! {player} is sent off!',
      '🟥 {player} sees red!',
      '🟥 Dismissed! {player} has to go!',
      '🟥 {player} is off! Red card!',
    ],

    // Injuries & Substitutions
    injury: [
      '🚑 {player} is down injured',
      '🚑 Injury concern for {player}',
      '🚑 {player} needs treatment',
      '🚑 Medical staff attending to {player}',
    ],
    substitution: [
      '🔄 Substitution: {playerOut} OFF, {playerIn} ON',
      '🔄 {team} make a change: {playerIn} replaces {playerOut}',
      '🔄 {playerOut} comes off, {playerIn} comes on',
    ],

    // Match Flow
    pressure: [
      '{team} piling on the pressure',
      '{team} in control here',
      '{team} dominating possession',
      'All {team} at the moment',
    ],
    counter_attack: [
      '{team} break quickly!',
      'Counter attack from {team}!',
      '{team} on the break!',
      'Fast break by {team}!',
    ],
    dangerous_moment: [
      'Dangerous play from {team}',
      '{team} looking threatening',
      'This could be dangerous for {team}',
    ],

    // Time-based
    kickoff: [
      '⚽ Kick-off! The match is underway',
      '⚽ We\'re off! Match begins',
      '⚽ The game starts!',
    ],
    halftime: [
      '⏸️ Half-time',
      '⏸️ The whistle goes for half-time',
      '⏸️ That\'s the break',
    ],
    second_half_kickoff: [
      '⚽ Second half underway',
      '⚽ Back for the second half',
      '⚽ Second half begins',
    ],
    final_whistle: [
      '⏱️ Full-time!',
      '⏱️ That\'s it! Match over',
      '⏱️ The final whistle blows',
    ],
    injury_time: [
      '⏱️ +{minutes} minutes of injury time',
      '⏱️ {minutes} additional minutes',
      '⏱️ The board shows +{minutes}',
    ],
  };

  // Generate random commentary based on event type
  generateCommentary(event: {
    type: string;
    minute: number;
    playerName?: string;
    teamName?: string;
    teamId?: string;
    playerId?: string;
    metadata?: any;
  }): CommentaryEvent {
    const templates = this.commentaryTemplates[event.type] || [];
    
    if (templates.length === 0) {
      return {
        minute: event.minute,
        type: event.type,
        text: `Match event at ${event.minute}'`,
        importance: 'low',
        teamId: event.teamId,
        playerId: event.playerId,
        playerName: event.playerName,
      };
    }

    const template = templates[Math.floor(Math.random() * templates.length)];
    
    let text = template
      .replace('{player}', event.playerName || 'Player')
      .replace('{team}', event.teamName || 'Team')
      .replace('{playerOut}', event.metadata?.playerOut || 'Player')
      .replace('{playerIn}', event.metadata?.playerIn || 'Player')
      .replace('{minutes}', event.metadata?.minutes || '3');

    // Determine importance
    const highImportance = ['goal', 'goal_header', 'goal_long_range', 'goal_penalty', 'red_card', 'great_save', 'hit_post', 'hit_crossbar'];
    const mediumImportance = ['shot_on_target', 'good_save', 'yellow_card', 'injury', 'substitution', 'key_pass', 'counter_attack'];
    
    let importance: 'low' | 'medium' | 'high' = 'low';
    if (highImportance.includes(event.type)) importance = 'high';
    else if (mediumImportance.includes(event.type)) importance = 'medium';

    return {
      minute: event.minute,
      type: event.type,
      text,
      importance,
      teamId: event.teamId,
      playerId: event.playerId,
      playerName: event.playerName,
    };
  }

  // Generate realistic match commentary flow
  generateMatchCommentary(minute: number, matchState: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    homePlayers: any[];
    awayPlayers: any[];
  }): CommentaryEvent[] {
    const events: CommentaryEvent[] = [];

    // Special minute events
    if (minute === 1) {
      events.push(this.generateCommentary({
        type: 'kickoff',
        minute: 1,
        teamName: matchState.homeTeam,
      }));
    } else if (minute === 45) {
      events.push(this.generateCommentary({
        type: 'halftime',
        minute: 45,
      }));
    } else if (minute === 46) {
      events.push(this.generateCommentary({
        type: 'second_half_kickoff',
        minute: 46,
      }));
    } else if (minute === 90) {
      const injuryMinutes = Math.floor(Math.random() * 3) + 2;
      events.push(this.generateCommentary({
        type: 'injury_time',
        minute: 90,
        metadata: { minutes: injuryMinutes },
      }));
    } else if (minute >= 94) {
      events.push(this.generateCommentary({
        type: 'final_whistle',
        minute,
      }));
    }

    // Generate random events based on probability (Speed Manager is FAST)
    const eventChance = Math.random();

    // More frequent events for Speed Manager
    if (eventChance < 0.15) { // 15% chance per minute
      const isHomeTeam = Math.random() > 0.5;
      const team = isHomeTeam ? matchState.homeTeam : matchState.awayTeam;
      const players = isHomeTeam ? matchState.homePlayers : matchState.awayPlayers;
      const player = players[Math.floor(Math.random() * Math.min(11, players.length))];

      // Random event type
      const roll = Math.random();
      
      if (roll < 0.05) { // 5% - Goal!
        events.push(this.generateCommentary({
          type: this.getGoalType(),
          minute,
          playerName: player?.name || 'Unknown',
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
          playerId: player?.id,
        }));
      } else if (roll < 0.15) { // 10% - Shot
        const shotType = Math.random() < 0.5 ? 'shot_on_target' : 'shot_off_target';
        events.push(this.generateCommentary({
          type: shotType,
          minute,
          playerName: player?.name || 'Unknown',
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
          playerId: player?.id,
        }));
      } else if (roll < 0.20) { // 5% - Near miss
        const nearMissTypes = ['hit_post', 'hit_crossbar', 'just_wide'];
        const nearMissType = nearMissTypes[Math.floor(Math.random() * nearMissTypes.length)];
        events.push(this.generateCommentary({
          type: nearMissType,
          minute,
          playerName: player?.name || 'Unknown',
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
          playerId: player?.id,
        }));
      } else if (roll < 0.35) { // 15% - Possession/buildup
        const buildupTypes = ['possession_change', 'buildup', 'pass_completed', 'key_pass'];
        const buildupType = buildupTypes[Math.floor(Math.random() * buildupTypes.length)];
        events.push(this.generateCommentary({
          type: buildupType,
          minute,
          playerName: player?.name || 'Unknown',
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
          playerId: player?.id,
        }));
      } else if (roll < 0.45) { // 10% - Set pieces
        const setPieceTypes = ['corner_won', 'freekick_awarded'];
        const setPieceType = setPieceTypes[Math.floor(Math.random() * setPieceTypes.length)];
        events.push(this.generateCommentary({
          type: setPieceType,
          minute,
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
        }));
      } else if (roll < 0.50) { // 5% - Fouls
        events.push(this.generateCommentary({
          type: 'foul',
          minute,
          playerName: player?.name || 'Unknown',
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
          playerId: player?.id,
        }));
      } else if (roll < 0.52) { // 2% - Yellow card
        events.push(this.generateCommentary({
          type: 'yellow_card',
          minute,
          playerName: player?.name || 'Unknown',
          teamName: team,
          teamId: isHomeTeam ? 'home' : 'away',
          playerId: player?.id,
        }));
      }
    }

    return events;
  }

  private getGoalType(): string {
    const roll = Math.random();
    if (roll < 0.15) return 'goal_header';
    if (roll < 0.25) return 'goal_long_range';
    if (roll < 0.30) return 'goal_penalty';
    return 'goal';
  }
}
