import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueTeam } from './league-team.entity';
import { LeaguePlayer } from './league-player.entity';

@Injectable()
export class LeagueTeamsService implements OnModuleInit {
  private usedPlayerNames: Set<string> = new Set();

  constructor(
    @InjectRepository(LeagueTeam)
    private leagueTeamsRepository: Repository<LeagueTeam>,
    @InjectRepository(LeaguePlayer)
    private leaguePlayersRepository: Repository<LeaguePlayer>,
  ) {}

  async onModuleInit() {
    const count = await this.leagueTeamsRepository.count();
    if (count === 0) {
      await this.seedLeague();
    }
  }

  async findAll() {
    return this.leagueTeamsRepository.find({
      relations: ['players'],
      order: { points: 'DESC', goalsFor: 'DESC' },
    });
  }

  async findById(id: string) {
    return this.leagueTeamsRepository.findOne({
      where: { id },
      relations: ['players'],
    });
  }

  async updateFormation(teamId: string, formation: string, lineup: any[]) {
    const team = await this.findById(teamId);
    if (!team) return null;

    // Reset all players
    await this.leaguePlayersRepository.update(
      { teamId },
      { isStarter: false, positionInFormation: null }
    );

    // Update lineup
    for (const position of lineup) {
      await this.leaguePlayersRepository.update(
        { id: position.playerId },
        { 
          isStarter: true, 
          positionInFormation: position.slot 
        }
      );
    }

    team.formation = formation;
    return this.leagueTeamsRepository.save(team);
  }

  async getLeagueTable() {
    const teams = await this.leagueTeamsRepository.find({
      order: { points: 'DESC', goalsFor: 'DESC' },
    });

    return teams.map((team, index) => ({
      position: index + 1,
      team: team.name,
      played: team.wins + team.draws + team.losses,
      won: team.wins,
      drawn: team.draws,
      lost: team.losses,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      goalDifference: team.goalsFor - team.goalsAgainst,
      points: team.points,
      form: team.recentForm || [],
    }));
  }

  async resetLeague() {
    console.log('🔄 Resetting league database...');
    
    // Delete all players and teams
    await this.leaguePlayersRepository.delete({});
    await this.leagueTeamsRepository.delete({});
    
    console.log('✅ Database cleared, reseeding...');
    
    // Reseed with new 18-player logic
    await this.seedLeague();
    
    return { 
      success: true, 
      message: 'League reset successful! All teams now have 18 balanced players.' 
    };
  }

  private async seedLeague() {
    console.log('🏆 Seeding league with 16 teams...');
    
    // Reset used names tracker
    this.usedPlayerNames.clear();

    const teamsData = [
      // Top tier teams: $150-200M
      { name: 'Red Devils', originalName: 'Manchester United', manager: 'Erik ten Hag', budget: 180000000 },
      { name: 'Blaugrana', originalName: 'Barcelona', manager: 'Xavi Hernández', budget: 175000000 },
      { name: 'Los Blancos', originalName: 'Real Madrid', manager: 'Carlo Ancelotti', budget: 200000000 },
      { name: 'The Citizens', originalName: 'Manchester City', manager: 'Pep Guardiola', budget: 190000000 },
      { name: 'Les Parisiens', originalName: 'Paris Saint-Germain', manager: 'Luis Enrique', budget: 195000000 },
      { name: 'Die Roten', originalName: 'Bayern Munich', manager: 'Thomas Tuchel', budget: 170000000 },
      
      // Mid-tier teams: $80-120M
      { name: 'The Blues', originalName: 'Chelsea', manager: 'Mauricio Pochettino', budget: 115000000 },
      { name: 'The Reds', originalName: 'Liverpool', manager: 'Jürgen Klopp', budget: 120000000 },
      { name: 'The Gunners', originalName: 'Arsenal', manager: 'Mikel Arteta', budget: 110000000 },
      { name: 'Bianconeri', originalName: 'Juventus', manager: 'Massimiliano Allegri', budget: 95000000 },
      { name: 'Nerazzurri', originalName: 'Inter Milan', manager: 'Simone Inzaghi', budget: 90000000 },
      { name: 'Colchoneros', originalName: 'Atlético Madrid', manager: 'Diego Simeone', budget: 100000000 },
      
      // Lower tier teams: $50-80M
      { name: 'Rossoneri', originalName: 'AC Milan', manager: 'Stefano Pioli', budget: 75000000 },
      { name: 'Spurs', originalName: 'Tottenham', manager: 'Ange Postecoglou', budget: 80000000 },
      { name: 'Die Borussen', originalName: 'Borussia Dortmund', manager: 'Edin Terzić', budget: 70000000 },
      { name: 'I Lupi', originalName: 'AS Roma', manager: 'Daniele De Rossi', budget: 60000000 },
    ];

    for (const teamData of teamsData) {
      const team = this.leagueTeamsRepository.create({
        ...teamData,
        nickname: teamData.name,
        formation: this.getRandomFormation(),
        tactics: this.getRandomTactics(),
        recentForm: this.generateRandomForm(),
      });

      const savedTeam = await this.leagueTeamsRepository.save(team);
      await this.seedTeamPlayers(savedTeam.id, teamData.name);
    }

    console.log('✅ Seeded 16 teams with 18 balanced players each!');
  }

  private async seedTeamPlayers(teamId: string, teamName: string) {
    // Define specific positions with counts for realistic squad composition
    // Total: 18 players (2 GK + 6 DEF + 6 MID + 4 FWD)
    const positionGroups = [
      // Goalkeepers (2)
      { positions: ['GK', 'GK'], ratingRange: [75, 85] },
      // Defenders (6): 2 CB, 2 LB/RB, 2 flexible
      { positions: ['CB', 'CB', 'LB', 'RB', 'CB', 'RB'], ratingRange: [70, 88] },
      // Midfielders (6): mix of CM, CDM, CAM, LM, RM
      { positions: ['CM', 'CM', 'CDM', 'CAM', 'LM', 'RM'], ratingRange: [72, 90] },
      // Forwards (4): ST, wingers
      { positions: ['ST', 'ST', 'LW', 'RW'], ratingRange: [75, 92] },
    ];

    let playerIndex = 1;
    for (const group of positionGroups) {
      for (const position of group.positions) {
        const rating = Math.floor(
          group.ratingRange[0] + Math.random() * (group.ratingRange[1] - group.ratingRange[0])
        );
        
        const player = this.leaguePlayersRepository.create({
          name: this.generatePlayerName(position),
          position: position,
          rating,
          price: this.calculatePrice(rating),
          teamId,
          isStarter: playerIndex <= 11, // First 11 are starters
          positionInFormation: playerIndex <= 11 ? playerIndex : null,
          fitness: 85 + Math.floor(Math.random() * 15),
          morale: 'Normal',
        });

        await this.leaguePlayersRepository.save(player);
        playerIndex++;
      }
    }
  }

  private generatePlayerName(position: string): string {
    // Real football star names organized by position
    const playersByPosition = {
      'GK': [
        'Jan Oblak', 'Manuel Neuer', 'Keylor Navas', 'Hugo Lloris',
        'Yann Sommer', 'André Onana', 'Unai Simón', 'Wojciech Szczęsny',
        'David Raya', 'Nick Pope', 'Robert Sánchez', 'Gregor Kobel',
        'Bernd Leno', 'Aaron Ramsdale', 'Jordan Pickford', 'José Sá',
        'Emiliano Martínez', 'Ivo Grbić', 'Anatoliy Trubin', 'Giorgi Mamardashvili',
        'Guglielmo Vicario', 'Alex Meret', 'Lukasz Skorupski', 'Yassine Bounou',
        'Diogo Costa', 'Gavin Bazunu', 'David de Gea', 'Claudio Bravo',
        'Samir Handanović', 'Pau López', 'Péter Gulácsi', 'Lukas Hradecky'
      ],
      'CB': [
        'Sergio Ramos', 'Giorgio Chiellini', 'Thiago Silva', 'Raphael Varane',
        'Kalidou Koulibaly', 'Jules Koundé', 'Dayot Upamecano', 'Wesley Fofana',
        'Cristian Romero', 'Lisandro Martínez', 'Gabriel Magalhães', 'Ben White',
        'Ronald Araújo', 'Sven Botman', 'Matthijs de Ligt', 'Alessandro Bastoni',
        'Milan Škriniar', 'Stefan de Vrij', 'José María Giménez', 'Pau Torres',
        'Aymeric Laporte', 'John Stones', 'Nathan Aké', 'Eric Dier',
        'Micky van de Ven', 'Harry Maguire', 'Victor Lindelöf', 'Ibrahima Konaté',
        'Joe Gomez', 'Niklas Süle', 'Lucas Hernández', 'Benjamin Pavard'
      ],
      'LB': [
        'Andrew Robertson', 'Alphonso Davies', 'Ferland Mendy', 'Alex Telles',
        'Luke Shaw', 'Nuno Mendes', 'Pervis Estupiñán', 'Oleksandr Zinchenko',
        'Ben Chilwell', 'Marcos Alonso', 'Kostas Tsimikas', 'David Raum',
        'Álex Grimaldo', 'Robin Gosens', 'Rayan Aït-Nouri', 'Destiny Udogie',
        'Marc Cucurella', 'Sergio Reguilón', 'Tyrell Malacia', 'Raphaël Guerreiro',
        'Juan Bernat', 'Angeliño', 'Rico Lewis', 'Jordi Alba'
      ],
      'RB': [
        'Trent Alexander-Arnold', 'Kyle Walker', 'Achraf Hakimi', 'Benjamin Pavard',
        'Dani Carvajal', 'Kieran Trippier', 'Denzel Dumfries', 'Pedro Porro',
        'Jeremie Frimpong', 'Vanderson', 'Malo Gusto', 'Cesar Azpilicueta',
        'Jules Koundé', 'Joshua Kimmich', 'Diogo Dalot', 'Aaron Wan-Bissaka',
        'Matt Doherty', 'Reece James', 'Thomas Meunier', 'Noussair Mazraoui',
        'Sergiño Dest', 'Giovanni Di Lorenzo', 'Rick Karsdorp', 'Djed Spence'
      ],
      'CDM': [
        'Casemiro', 'Joshua Kimmich', 'Fabinho', 'N\'Golo Kanté',
        'Thomas Partey', 'Douglas Luiz', 'Moisés Caicedo', 'Romeo Lavia',
        'Wilfred Ndidi', 'Ibrahim Sangaré', 'Tyler Adams', 'Edson Álvarez',
        'Kalvin Phillips', 'Martin Zubimendi', 'Danilo Pereira', 'Manuel Locatelli',
        'Sandro Tonali', 'Marcelo Brozović', 'Yves Bissouma', 'Sofyan Amrabat',
        'André', 'Exequiel Palacios', 'Boubacar Kamara', 'Ryan Gravenberch'
      ],
      'CM': [
        'Toni Kroos', 'Marco Verratti', 'Sergio Busquets', 'Frenkie de Jong',
        'İlkay Gündoğan', 'Leon Goretzka', 'Mateo Kovačić', 'Conor Gallagher',
        'Jorginho', 'Granit Xhaka', 'Scott McTominay', 'Christian Eriksen',
        'Nicolò Barella', 'Henrikh Mkhitaryan', 'Sergej Milinković-Savić', 'Guido Rodríguez',
        'Vitinha', 'Warren Zaïre-Emery', 'Eduardo Camavinga', 'Youri Tielemans',
        'Rúben Neves', 'Gavi', 'Pedri', 'Pablo Sarabia'
      ],
      'CAM': [
        'Martin Ødegaard', 'James Maddison', 'Jack Grealish', 'Mason Mount',
        'Bernardo Silva', 'Houssem Aouar', 'Christopher Nkunku', 'Florian Wirtz',
        'Hakim Ziyech', 'Dani Olmo', 'Marcel Sabitzer', 'Jamal Musiala',
        'Paulo Dybala', 'Riyad Mahrez', 'Phil Foden', 'Emile Smith Rowe',
        'Kai Havertz', 'Dimitri Payet', 'Eberechi Eze', 'Harvey Barnes',
        'Nabil Fekir', 'Julian Brandt', 'Dušan Tadić', 'Fabio Vieira'
      ],
      'LM': [
        'Ousmane Dembélé', 'João Félix', 'Raheem Sterling', 'Leroy Sané',
        'Kingsley Coman', 'Marcus Rashford', 'Son Heung-min', 'Luis Díaz',
        'Vinícius Jr.', 'Eden Hazard', 'Jadon Sancho', 'Allan Saint-Maximin',
        'Jack Harrison', 'Yannick Carrasco', 'Jérémy Doku', 'Arnaut Danjuma',
        'Raphinha', 'Pedro Neto', 'Ryan Kent', 'Leon Bailey',
        'Wilfried Zaha', 'Diogo Jota', 'Ismaila Sarr', 'Nicolas Pépé'
      ],
      'RM': [
        'Serge Gnabry', 'Federico Chiesa', 'Ferran Torres', 'Riyad Mahrez',
        'Gabriel Martinelli', 'Antony', 'Khvicha Kvaratskhelia', 'Julián Álvarez',
        'Jarrod Bowen', 'Adama Traoré', 'Dejan Kulusevski', 'Lucas Ocampos',
        'Noni Madueke', 'Takefusa Kubo', 'Domenico Berardi', 'Steven Bergwijn',
        'Amine Harit', 'Carlos Soler', 'Matheus Cunha', 'Pablo Sarabia',
        'Dušan Vlahović', 'Cengiz Ünder', 'Andreas Skov Olsen', 'Jesús Corona'
      ],
      'ST': [
        'Karim Benzema', 'Lautaro Martínez', 'Victor Osimhen', 'Dusan Vlahović',
        'Ivan Toney', 'Ollie Watkins', 'Alexander Isak', 'Randal Kolo Muani',
        'Jonathan David', 'Patrik Schick', 'Gianluca Scamacca', 'Tammy Abraham',
        'Dominic Calvert-Lewin', 'Callum Wilson', 'Romelu Lukaku', 'Timo Werner',
        'Álvaro Morata', 'Memphis Depay', 'Youssef En-Nesyri', 'Wissam Ben Yedder',
        'Ciro Immobile', 'Edin Džeko', 'Paulo Dybala', 'Gonçalo Ramos',
        'Rasmus Højlund', 'Joshua Zirkzee', 'Loïs Openda', 'Serhou Guirassy',
        'Artem Dovbyk', 'Santiago Giménez', 'Benjamin Šeško', 'Mateo Retegui'
      ],
      'LW': [
        'Sadio Mané', 'Heung-Min Son', 'Ansu Fati', 'Moussa Diaby',
        'Nico Williams', 'Alejandro Garnacho', 'Cody Gakpo', 'Anthony Elanga',
        'Marco Asensio', 'Cristian Tello', 'Samuel Chukwueze', 'Ferran Torres',
        'Yeremy Pino', 'Álex Baena', 'Bryan Gil', 'Facundo Pellistri',
        'Michael Olise', 'Crysencio Summerville', 'Mikel Oyarzabal', 'Vinícius Júnior',
        'Rafael Leão', 'Leroy Sané', 'Julian Alvarez', 'Lois Openda'
      ],
      'RW': [
        'Mohamed Salah', 'Bernardo Silva', 'Ángel Di María', 'Hakim Ziyech',
        'Rodrygo', 'Bukayo Saka', 'Dejan Kulusevski', 'Bryan Mbeumo',
        'Jesús Navas', 'Riyad Mahrez', 'Federico Chiesa', 'Dušan Tadić',
        'Mason Greenwood', 'Amad Diallo', 'Anwar El Ghazi', 'Lucas Moura',
        'David Neres', 'Arnaut Groeneveld', 'Mohamed Kudus', 'Matheus Pereira',
        'Yankuba Minteh', 'Callum Hudson-Odoi', 'Hakim Ziyech', 'Gelson Martins'
      ],
    };

    // Get player pool for this position, fallback to ST if position not found
    const pool = playersByPosition[position] || playersByPosition['ST'];
    
    // Filter out already used names
    const availableNames = pool.filter(name => !this.usedPlayerNames.has(name));
    
    // If all names are used, allow duplicates (shouldn't happen with expanded pools)
    const finalPool = availableNames.length > 0 ? availableNames : pool;
    
    // Pick a random name from the pool
    const randomIndex = Math.floor(Math.random() * finalPool.length);
    const selectedName = finalPool[randomIndex];
    
    // Mark this name as used
    this.usedPlayerNames.add(selectedName);
    
    return selectedName;
  }

  private calculatePrice(rating: number): number {
    const basePrice = 500000;
    const multiplier = Math.pow(1.15, rating - 70);
    return Math.floor(basePrice * multiplier);
  }

  private getRandomFormation(): string {
    const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3'];
    return formations[Math.floor(Math.random() * formations.length)];
  }

  private getRandomTactics(): string {
    const tactics = ['Attacking', 'Balanced', 'Defensive'];
    return tactics[Math.floor(Math.random() * tactics.length)];
  }

  private generateRandomForm(): string[] {
    const results = ['W', 'D', 'L'];
    const form = [];
    for (let i = 0; i < 5; i++) {
      form.push(results[Math.floor(Math.random() * results.length)]);
    }
    return form;
  }
}
